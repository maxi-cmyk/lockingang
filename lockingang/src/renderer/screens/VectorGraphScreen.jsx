import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import MissionBriefingScreen from "./MissionBriefingScreen";
import { getNodes, subscribe, initNodes } from "../nodeStore";

const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const ZOOM_SENSITIVITY = 0.001;

const VectorGraphScreen = () => {
  const [showBriefing, setShowBriefing] = useState(false);
  const [nodes, setNodes] = useState(() => getNodes());

  // World-space pixel positions per node id
  const [positions, setPositions] = useState({});

  // Viewport transform
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  const [selectedNode, setSelectedNode] = useState(null);
  const [showConnectionBanner, setShowConnectionBanner] = useState(false);
  const [newNodeLabel, setNewNodeLabel] = useState("");
  const [nodeSaved, setNodeSaved] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [backendStatus, setBackendStatus] = useState("loading"); // 'loading' | 'live' | 'offline'
  const [editedData, setEditedData] = useState(""); // controlled textarea for node data

  const canvasRef = useRef(null);
  // Drag state stored in refs to avoid stale closures mid-gesture
  const interactionRef = useRef(null);
  // { type: 'node'|'pan', nodeId?, startMouseX, startMouseY, startValX, startValY }

  const location = useLocation();

  // ── Store subscription ───────────────────────────────────────────────────
  useEffect(() => {
    return subscribe((updated) => setNodes([...updated]));
  }, []);

  // ── Try to load from Python backend via IPC ──────────────────────────────
  useEffect(() => {
    initNodes()
      .then(() => setBackendStatus("live"))
      .catch(() => setBackendStatus("offline"));
  }, []);

  // ── Initialise world-space positions from % coords in nodeStore ──────────
  const initPositions = useCallback((nodeList) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height } = canvas.getBoundingClientRect();
    // If the canvas hasn't been laid out yet (0-dimensions), retry after the
    // next paint instead of writing {x:0, y:0} which collapses all nodes and
    // makes the overlap-culling code hide every edge.
    if (width === 0 || height === 0) {
      requestAnimationFrame(() => initPositions(nodeList));
      return;
    }
    setPositions((prev) => {
      const next = { ...prev };
      nodeList.forEach((n) => {
        if (!next[n.id]) {
          next[n.id] = { x: (n.x / 100) * width, y: (n.y / 100) * height };
        }
      });
      return next;
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    initPositions(nodes);
    const ro = new ResizeObserver(() => initPositions(nodes));
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [nodes, initPositions]);

  // ── Auto-select & centre new node from Save & Connect ───────────────────
  useEffect(() => {
    const state = location.state;
    if (!state?.newNodeId) return;
    const node = getNodes().find((n) => n.id === state.newNodeId);
    if (!node) return;
    setSelectedNode(node);
    setNewNodeLabel(node.label);
    setShowConnectionBanner(true);
    setTimeout(() => setShowConnectionBanner(false), 5000);
    // Centre after positions are populated (brief delay)
    setTimeout(() => centreNode(node.id), 80);
  }, [location.state]); // eslint-disable-line

  // ── Centre a node in the viewport ────────────────────────────────────────
  const centreNode = (nodeId) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setPositions((prev) => {
      const pos = prev[nodeId];
      if (!pos) return prev;
      const { width, height } = canvas.getBoundingClientRect();
      setScale((s) => {
        setPan({
          x: width / 2 - pos.x * s,
          y: height / 2 - pos.y * s,
        });
        return s;
      });
      return prev;
    });
  };

  // ── Canvas-space → world-space helper ────────────────────────────────────
  // (not needed directly, but useful for clarity)

  // ── Pointer events ────────────────────────────────────────────────────────
  const handleNodePointerDown = (e, node) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    interactionRef.current = {
      type: "node",
      nodeId: node.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startNodeX: positions[node.id]?.x ?? 0,
      startNodeY: positions[node.id]?.y ?? 0,
      moved: false,
    };
  };

  const handleCanvasPointerDown = (e) => {
    if (e.target !== canvasRef.current && !e.target.closest(".graph-layer")) return;
    interactionRef.current = {
      type: "pan",
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
      moved: false,
    };
  };

  const handlePointerMove = (e) => {
    const ia = interactionRef.current;
    if (!ia) return;
    const dx = e.clientX - ia.startMouseX;
    const dy = e.clientY - ia.startMouseY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) ia.moved = true;

    if (ia.type === "node") {
      // Divide by scale to convert screen delta → world delta
      setPositions((prev) => ({
        ...prev,
        [ia.nodeId]: {
          x: ia.startNodeX + dx / scale,
          y: ia.startNodeY + dy / scale,
        },
      }));
    } else if (ia.type === "pan") {
      setPan({ x: ia.startPanX + dx, y: ia.startPanY + dy });
    }
  };

  const handlePointerUp = (e) => {
    const ia = interactionRef.current;
    interactionRef.current = null;
    if (!ia) return;

    // Fire click only if pointer barely moved (not a drag)
    if (ia.type === "node" && !ia.moved) {
      const node = nodes.find((n) => n.id === ia.nodeId);
      if (node) {
        setSelectedNode(node);
        setEditedData(node.data || node.label || ""); // reset textarea to node's current data
        setNodeSaved(false);
        centreNode(ia.nodeId);
      }
    }
  };

  // ── Wheel zoom toward cursor ──────────────────────────────────────────────
  const handleWheel = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left; // cursor in canvas space
    const cy = e.clientY - rect.top;

    const delta = -e.deltaY * ZOOM_SENSITIVITY;
    const factor = Math.exp(delta * 2.5);

    setScale((prevScale) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prevScale * factor));
      const ratio = newScale / prevScale;
      setPan((prevPan) => ({
        x: cx - (cx - prevPan.x) * ratio,
        y: cy - (cy - prevPan.y) * ratio,
      }));
      return newScale;
    });
  };

  // Attach wheel with passive:false so we can preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }); // re-attach each render so pan/scale are fresh

  const closeInspector = () => setSelectedNode(null);

  // ── Edge list ─────────────────────────────────────────────────────────────
  const edges = [];
  nodes.forEach((node) => {
    (node.connectedTo || []).forEach((targetId) => {
      const target = nodes.find((n) => n.id === targetId);
      if (target && positions[node.id] && positions[target.id]) {
        // target is the parent, node is the child. Flow is Parent -> Child.
        edges.push({ from: target, to: node });
      }
    });
  });

  return (
    <div className="h-screen flex overflow-hidden bg-vector-bg text-vector-white font-terminal relative">
      <div className="scanline" />
      <Sidebar />

      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-vector-blue flex items-center justify-between px-6 backdrop-blur-md bg-vector-bg/40 z-10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-vector-white/60 font-mono tracking-wider">KNOWLEDGE_BASE</span>
            <span className="text-[10px] text-vector-blue font-bold">&gt;&gt;</span>
            <span className="text-[10px] text-vector-blue font-mono tracking-wider terminal-text">VECTOR_GRAPH</span>
          </div>
        </header>

        {/* Grid background (NOT transformed — it tiles across the full viewport) */}
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundSize: `${32 * scale}px ${32 * scale}px`,
            backgroundPosition: `${pan.x % (32 * scale)}px ${pan.y % (32 * scale)}px`,
            backgroundImage:
              "linear-gradient(to right, rgba(125,249,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(125,249,255,0.04) 1px, transparent 1px)",
          }}
        />

        <main className="flex-1 relative flex flex-col overflow-hidden">
          {/* ── Canvas (receives pan/zoom events) ── */}
          <div
            ref={canvasRef}
            className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Fixed HUD — stays in place while graph pans */}
            <div className="absolute top-6 left-8 z-20 space-y-1 text-[9px] tracking-widest uppercase text-vector-blue/60 pointer-events-none">
              <div className="text-vector-blue/90">NODES: {nodes.length}</div>
              <div>LINKS: {edges.length}</div>
              <div>ZOOM: {Math.round(scale * 100)}%</div>
              <div>
                BACKEND:{" "}
                <span className={
                  backendStatus === "live" ? "text-green-400" :
                    backendStatus === "offline" ? "text-amber-400" :
                      "text-vector-blue/40"
                }>
                  {backendStatus === "live" ? "LIVE" : backendStatus === "offline" ? "OFFLINE" : "..."}
                </span>
              </div>
            </div>

            {/* Connection banner */}
            {showConnectionBanner && (
              <div className="absolute top-6 right-8 w-80 z-30">
                <div className="bg-vector-bg/90 border border-vector-blue p-4 shadow-card-glow backdrop-blur-md relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-vector-blue" />
                  <div className="flex items-start gap-3 mb-2">
                    <div className="p-1 bg-vector-blue/20 border border-vector-blue/50 text-vector-blue">
                      <span className="material-symbols-outlined text-[18px]">link</span>
                    </div>
                    <div>
                      <h3 className="text-vector-blue font-bold text-[9px] tracking-widest uppercase">CONNECTION_ESTABLISHED</h3>
                      <p className="text-vector-white/70 text-[9px] mt-1 leading-relaxed font-mono">
                        Node <span className="text-vector-white">[{newNodeLabel}]</span> added to Knowledge Graph.
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => setShowConnectionBanner(false)}
                      className="text-[9px] tracking-widest uppercase text-vector-blue hover:text-vector-white transition-colors flex items-center gap-1"
                    >
                      DISMISS <span className="material-symbols-outlined text-[12px]">close</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* NODE_INSPECTOR */}
            {selectedNode && !showConnectionBanner && (
              <div className="absolute top-6 right-8 w-72 z-30 border border-vector-blue bg-vector-bg/95 backdrop-blur-md shadow-card-glow">
                <div className="flex items-center justify-between px-4 py-3 border-b border-vector-blue/30">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-vector-blue text-sm">settings</span>
                    <span className="text-[9px] text-vector-blue tracking-widest uppercase font-bold">NODE_INSPECTOR</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setInspectorCollapsed((c) => !c)}
                      className="text-vector-white/30 hover:text-vector-blue transition-colors"
                      title={inspectorCollapsed ? "Expand" : "Collapse"}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {inspectorCollapsed ? "add" : "remove"}
                      </span>
                    </button>
                    <button onClick={closeInspector} className="text-vector-white/30 hover:text-vector-white transition-colors">
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                </div>
                {!inspectorCollapsed && (
                  <div className="p-4 flex flex-col gap-4">
                    <div>
                      <p className="text-[7px] text-vector-blue/40 font-mono tracking-widest uppercase mb-2">
                        DATA_PAYLOAD // {selectedNode.id.toUpperCase()}
                      </p>
                      <textarea
                        value={editedData}
                        onChange={(e) => setEditedData(e.target.value)}
                        rows={4}
                        className="w-full bg-black/60 border border-vector-blue/20 p-3 text-vector-white/70 text-[10px] font-mono leading-relaxed resize-none outline-none focus:border-vector-blue/60 transition-colors"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        // Optimistic UI feedback
                        setNodeSaved(true);
                        setTimeout(() => setNodeSaved(false), 2000);
                        // Call backend if available
                        if (typeof window !== "undefined" && window.api?.updateNode) {
                          try {
                            await window.api.updateNode(selectedNode.id, editedData);
                          } catch (err) {
                            console.warn("[NodeInspector] updateNode failed:", err.message);
                          }
                        }
                      }}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 border transition-all text-[10px] tracking-widest uppercase font-mono
                        ${nodeSaved
                          ? "border-green-500/60 bg-green-500/10 text-green-400"
                          : "border-vector-blue/40 bg-vector-blue/5 hover:bg-vector-blue/20 text-vector-blue"}`}
                    >
                      <span className="material-symbols-outlined text-sm">{nodeSaved ? "check_circle" : "save"}</span>
                      {nodeSaved ? "SAVED" : "SAVE"}
                    </button>
                  </div>
                )}
              </div>
            )}


            {/* ── Graph layer — single transform for pan + scale ── */}
            <div
              className="graph-layer absolute inset-0"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transformOrigin: "0 0",
                // No CSS transition — JS drives this for instant pan; centreNode uses setScale/setPan directly
              }}
            >
              {/* SVG edges */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ overflow: "visible" }}>
                <defs>
                  <filter id="vectorGlow">
                    <feGaussianBlur result="blur" stdDeviation="2.5" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="10"
                    refX="9"
                    refY="5"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M 0 1 L 9 5 L 0 9 z" fill="#7DF9FF" opacity="0.8" />
                  </marker>
                </defs>
                {edges.map(({ from, to }, i) => {
                  const fx = positions[from.id]?.x ?? 0;
                  const fy = positions[from.id]?.y ?? 0;
                  const tx = positions[to.id]?.x ?? 0;
                  const ty = positions[to.id]?.y ?? 0;
                  const isPrimary = from.isPrimary || to.isPrimary;

                  const dx = tx - fx;
                  const dy = ty - fy;
                  const dist = Math.hypot(dx, dy);
                  if (dist === 0) return null;

                  // Node outer radius: primary=28, secondary=20
                  // Add gap constraints: from gap=4px, to gap=6px (leaving room for arrowhead)
                  const fromRadius = (from.isPrimary ? 28 : 20) + 4;
                  const toRadius = (to.isPrimary ? 28 : 20) + 6;

                  if (dist <= fromRadius + toRadius) return null; // Avoid drawing if overlapping

                  const x1 = fx + (dx / dist) * fromRadius;
                  const y1 = fy + (dy / dist) * fromRadius;
                  const x2 = tx - (dx / dist) * toRadius;
                  const y2 = ty - (dy / dist) * toRadius;

                  return (
                    <line
                      key={i}
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke="#7DF9FF"
                      strokeWidth={isPrimary ? 2 / scale : 1 / scale}
                      strokeDasharray={isPrimary ? "0" : `${5 / scale} ${3 / scale}`}
                      opacity={isPrimary ? 0.8 : 0.35}
                      filter={isPrimary ? "url(#vectorGlow)" : "none"}
                      markerEnd="url(#arrowhead)"
                    />
                  );
                })}
              </svg>

              {/* Nodes */}
              {nodes.map((node) => {
                const pos = positions[node.id];
                if (!pos) return null;
                const isSelected = selectedNode?.id === node.id;
                const sizePx = node.isPrimary ? 56 : 40;
                const borderW = node.isPrimary ? "2px" : "1px";

                return (
                  <div
                    key={node.id}
                    className="absolute flex flex-col items-center"
                    style={{
                      left: pos.x,
                      top: pos.y,
                      transform: "translate(-50%, -50%)",
                      cursor: "grab",
                    }}
                    onPointerDown={(e) => handleNodePointerDown(e, node)}
                  >
                    <div className="relative">
                      <div
                        style={{
                          width: sizePx,
                          height: sizePx,
                          borderWidth: borderW,
                          borderStyle: "solid",
                          borderColor: isSelected ? "#7DF9FF" : "rgba(125,249,255,0.5)",
                          boxShadow: isSelected
                            ? "0 0 24px rgba(125,249,255,0.7)"
                            : "none",
                        }}
                        className="flex items-center justify-center bg-vector-bg transition-all duration-150"
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{
                            fontSize: node.isPrimary ? "1.5rem" : "1.25rem",
                            color: isSelected ? "#7DF9FF" : "rgba(125,249,255,0.6)",
                          }}
                        >
                          {node.icon}
                        </span>
                      </div>
                      {isSelected && (
                        <div
                          className="absolute inset-0 border border-vector-blue animate-ping opacity-40 pointer-events-none"
                        />
                      )}
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        padding: "2px 8px",
                        border: `1px solid ${isSelected ? "#7DF9FF" : "rgba(125,249,255,0.3)"}`,
                        color: isSelected ? "#7DF9FF" : "rgba(125,249,255,0.5)",
                        fontSize: "8px",
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        fontFamily: "monospace",
                        whiteSpace: "nowrap",
                        background: "rgba(8,2,20,0.85)",
                      }}
                    >
                      {node.label}
                    </div>
                  </div>
                );
              })}
            </div> {/* graph layer */}

            {/* Bottom-left floating controls */}
            <div className="absolute bottom-6 left-6 z-20 flex items-center gap-4 pointer-events-auto">
              <button className="border border-vector-blue/50 bg-vector-blue/5 px-6 py-2 flex items-center gap-2 hover:bg-vector-blue/20 transition-all text-vector-white text-[9px] tracking-widest uppercase">
                <span className="material-symbols-outlined text-[18px]">magic_button</span>
                AUTO_SORT
              </button>
              <button className="border border-vector-blue bg-vector-blue/10 px-6 py-2 flex items-center gap-2 hover:bg-vector-blue/30 transition-all text-vector-white text-[9px] tracking-widest uppercase">
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                ADD_EDGE
              </button>
              <button className="border border-red-500/50 bg-red-500/5 px-6 py-2 flex items-center gap-2 text-red-400 hover:bg-red-500/20 transition-all text-[9px] tracking-widest uppercase">
                <span className="material-symbols-outlined text-[18px]">delete</span>
                DEL_EDGE
              </button>
            </div>

            {/* Bottom-right floating controls */}
            <div className="absolute bottom-6 right-6 z-20 pointer-events-auto">
              <div className="flex flex-col border border-vector-blue/30 divide-y divide-vector-blue/30">
                <button
                  onClick={() => { setPan({ x: 0, y: 0 }); setScale(1); }}
                  className="p-1 hover:bg-vector-blue/10 text-vector-blue/70 hover:text-vector-blue transition-colors"
                  title="Recenter"
                >
                  <span className="material-symbols-outlined text-[20px]">filter_center_focus</span>
                </button>
                <button
                  onClick={() => setScale((s) => Math.min(MAX_SCALE, s * 1.25))}
                  className="p-1 hover:bg-vector-blue/10 text-vector-blue/70 hover:text-vector-blue transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                </button>
                <button
                  onClick={() => setScale((s) => Math.max(MIN_SCALE, s / 1.25))}
                  className="p-1 hover:bg-vector-blue/10 text-vector-blue/70 hover:text-vector-blue transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">remove</span>
                </button>
              </div>
            </div>
          </div> {/* canvas */}
        </main>
      </div> {/* outer column */}

      {showBriefing && (
        <div className="absolute inset-0 z-50 bg-vector-bg/80 backdrop-blur-sm overflow-y-auto">
          <MissionBriefingScreen
            onClose={() => setShowBriefing(false)}
            onEngage={() => setShowBriefing(false)}
          />
        </div>
      )}
    </div>
  );
};


export default VectorGraphScreen;
