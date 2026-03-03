import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import MissionBriefingScreen from "./MissionBriefingScreen";
import { getNodes, subscribe, initNodes } from "../nodeStore";
import styles from "./KnowledgeTreeScreen.module.css";

const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const ZOOM_SENSITIVITY = 0.001;

const getNodeColors = (status, isSelected) => {
  if (isSelected) return { border: "#7DF9FF", icon: "#7DF9FF", glow: "0 0 24px rgba(125,249,255,0.7)", label: "#7DF9FF" };
  switch (status) {
    case "completed": return { border: "#7DF9FF", icon: "#7DF9FF", glow: "0 0 8px rgba(125,249,255,0.3)", label: "rgba(125,249,255,0.85)" };
    case "active": return { border: "#FFB800", icon: "#FFB800", glow: "0 0 8px rgba(255,184,0,0.25)", label: "rgba(255,184,0,0.9)" };
    case "critical": return { border: "#FF4444", icon: "#FF4444", glow: "0 0 12px rgba(255,68,68,0.5)", label: "rgba(255,68,68,0.9)" };
    case "locked": return { border: "rgba(125,249,255,0.18)", icon: "rgba(125,249,255,0.2)", glow: "none", label: "rgba(125,249,255,0.25)" };
    default: return { border: "rgba(125,249,255,0.45)", icon: "rgba(125,249,255,0.55)", glow: "none", label: "rgba(125,249,255,0.6)" };
  }
};

const KnowledgeTreeScreen = () => {
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
    if (e.target !== canvasRef.current && !e.target.closest(`.${styles.graphLayer}`)) return;
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
    <div className={styles.container}>
      <div className="scanline" />
      <Sidebar />

      <div className={styles.mainWrapper}>


        {/* Grid background (NOT transformed — it tiles across the full viewport) */}
        <div
          className={styles.gridBackground}
          style={{
            backgroundSize: `${32 * scale}px ${32 * scale}px`,
            backgroundPosition: `${pan.x % (32 * scale)}px ${pan.y % (32 * scale)}px`,
            backgroundImage:
              "linear-gradient(to right, rgba(125,249,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(125,249,255,0.04) 1px, transparent 1px)",
          }}
        />

        <main className={styles.mainArea}>
          {/* ── Canvas (receives pan/zoom events) ── */}
          <div
            ref={canvasRef}
            className={styles.canvasArea}
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Fixed HUD — stays in place while graph pans */}
            <div className={styles.hudOverlay}>
              <p className={styles.hudTotalNodes}>NODES: {nodes.length}</p>
              <p>LINKS: {edges.length}</p>
              {/* <p>ZOOM: {Math.round(scale * 100)}%</p>
              <p>
                BACKEND:{" "}
                <span className={
                  backendStatus === "live" ? styles.hudBackendLive :
                    backendStatus === "offline" ? styles.hudBackendOffline :
                      styles.hudBackendLoading
                }>
                  {backendStatus === "live" ? "LIVE" : backendStatus === "offline" ? "OFFLINE" : "..."}
                </span>
              </p> */}
            </div>

            {/* Connection banner */}
            {showConnectionBanner && (
              <div className={styles.connectionBannerWrapper}>
                <div className={styles.connectionBanner}>
                  <div className={styles.bannerEdge} />
                  <div className={styles.bannerContent}>
                    <div className={styles.bannerIconWrapper}>
                      <span className="material-symbols-outlined text-[18px]">link</span>
                    </div>
                    <div>
                      <h3 className={styles.bannerTitle}>CONNECTION_ESTABLISHED</h3>
                      <p className={styles.bannerText}>
                        Node <span className={styles.nodeHighlight}>[{newNodeLabel}]</span> added to Knowledge Graph.
                      </p>
                    </div>
                  </div>
                  <div className={styles.dismissButtonWrapper}>
                    <button
                      onClick={() => setShowConnectionBanner(false)}
                      className={styles.dismissButton}
                    >
                      DISMISS <span className="material-symbols-outlined text-[12px]">close</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* NODE_INSPECTOR */}
            {selectedNode && !showConnectionBanner && (
              <div className={styles.inspectorPanel}>
                <div className={styles.inspectorHeader}>
                  <div className={styles.inspectorTitleWrapper}>
                    <span className="material-symbols-outlined text-vector-blue text-sm">settings</span>
                    <span className={styles.inspectorTitle}>NODE_INSPECTOR</span>
                  </div>
                  <div className={styles.inspectorActions}>
                    <button
                      onClick={() => setInspectorCollapsed((c) => !c)}
                      className={styles.iconButton}
                      title={inspectorCollapsed ? "Expand" : "Collapse"}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {inspectorCollapsed ? "add" : "remove"}
                      </span>
                    </button>
                    <button onClick={closeInspector} className={styles.closeButton}>
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                </div>
                {!inspectorCollapsed && (
                  <div className={styles.inspectorContent}>
                    <div>
                      <p className={styles.payloadLabel}>
                        DATA_PAYLOAD // {selectedNode.id.toUpperCase()}
                      </p>
                      <textarea
                        value={editedData}
                        onChange={(e) => setEditedData(e.target.value)}
                        rows={4}
                        className={styles.payloadTextarea}
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
                      className={`${styles.saveButton} ${nodeSaved ? styles.saveButtonSuccess : styles.saveButtonDefault}`}
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
              className={styles.graphLayer}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transformOrigin: "0 0",
                // No CSS transition — JS drives this for instant pan; centreNode uses setScale/setPan directly
              }}
            >
              {/* SVG edges */}
              <svg className={styles.svgEdges} style={{ overflow: "visible" }}>
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
                const colors = getNodeColors(node.status, isSelected);

                return (
                  <div
                    key={node.id}
                    className={styles.nodeWrapper}
                    style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -50%)", cursor: "grab" }}
                    onPointerDown={(e) => handleNodePointerDown(e, node)}
                  >
                    <div className={styles.nodeCircleWrapper}>
                      <div
                        style={{
                          width: sizePx,
                          height: sizePx,
                          borderWidth: borderW,
                          borderStyle: "solid",
                          borderColor: colors.border,
                          boxShadow: colors.glow,
                        }}
                        className={styles.nodeCircle}
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: node.isPrimary ? "1.5rem" : "1.25rem", color: colors.icon }}
                        >
                          {node.icon}
                        </span>
                      </div>
                      {isSelected && (
                        <div className={styles.nodePing} />
                      )}
                      {node.status === "critical" && !isSelected && (
                        <div className={styles.nodeCriticalPulse} />
                      )}
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        padding: "2px 8px",
                        border: `1px solid ${colors.border}`,
                        color: colors.label,
                        fontSize: "8px",
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        fontFamily: "monospace",
                        whiteSpace: "nowrap",
                        background: "rgba(8,2,20,0.85)",
                      }}
                    >
                      {node.label}
                      {node.mastery !== null && node.mastery !== undefined && (
                        <span style={{ marginLeft: 6, opacity: 0.6 }}>{Math.round(node.mastery * 100)}%</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div> {/* graph layer */}

            {/* Bottom-left floating controls */}
            <div className={styles.bottomLeftControls}>
              <button className={`${styles.controlButton} ${styles.autoSortButton}`}>
                <span className="material-symbols-outlined text-[18px]">magic_button</span>
                <p>AUTO_SORT</p>
              </button>
              <button className={`${styles.controlButton} ${styles.addEdgeButton}`}>
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <p>ADD_EDGE</p>
              </button>
              <button className={`${styles.controlButton} ${styles.delEdgeButton}`}>
                <span className="material-symbols-outlined text-[18px]">delete</span>
                <p>DEL_EDGE</p>
              </button>
            </div>

            {/* Bottom-right floating controls */}
            <div className={styles.bottomRightControls}>
              <div className={styles.zoomControlGroup}>
                <button
                  onClick={() => { setPan({ x: 0, y: 0 }); setScale(1); }}
                  className={styles.zoomButton}
                  title="Recenter"
                >
                  <span className="material-symbols-outlined text-[20px]">filter_center_focus</span>
                </button>
                <button
                  onClick={() => setScale((s) => Math.min(MAX_SCALE, s * 1.25))}
                  className={styles.zoomButton}
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                </button>
                <button
                  onClick={() => setScale((s) => Math.max(MIN_SCALE, s / 1.25))}
                  className={styles.zoomButton}
                >
                  <span className="material-symbols-outlined text-[20px]">remove</span>
                </button>
              </div>
            </div>
          </div> {/* canvas */}
        </main>
      </div> {/* outer column */}

      {showBriefing && (
        <div className={styles.briefingOverlay}>
          <MissionBriefingScreen
            onClose={() => setShowBriefing(false)}
            onEngage={() => setShowBriefing(false)}
          />
        </div>
      )}
    </div>
  );
};


export default KnowledgeTreeScreen;
