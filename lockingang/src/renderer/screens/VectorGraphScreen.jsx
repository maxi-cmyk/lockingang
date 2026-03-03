import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import {
  getNodes, subscribe as subscribeNodes, initNodes, addNode as addVisualNode,
  deleteNodeById, updateNodeInStore,
} from "../nodeStore";
import {
  subscribe as subscribeStudy, getState as getStudyState, getNodeById,
  updateNodeDescription, renameNode, deleteStudyNode, addStudyNode, attachFileToNode,
  setTestDate, getDaysToTest,
} from "../studyStore";

const MIN_SCALE = 0.2;
const MAX_SCALE = 3;
const ZOOM_SENSITIVITY = 0.001;

const getNodeColors = (status, mastery, isSelected) => {
  if (isSelected) return { border: "#7DF9FF", icon: "#7DF9FF", glow: "0 0 24px rgba(125,249,255,0.7)", label: "#7DF9FF" };
  if (mastery !== null && mastery !== undefined) {
    if (mastery >= 0.7) return { border: "#7DF9FF", icon: "#7DF9FF", glow: "0 0 8px rgba(125,249,255,0.3)", label: "rgba(125,249,255,0.85)" };
    if (mastery >= 0.3) return { border: "#FFB800", icon: "#FFB800", glow: "0 0 8px rgba(255,184,0,0.25)", label: "rgba(255,184,0,0.9)" };
    if (mastery > 0) return { border: "#FF4444", icon: "#FF4444", glow: "0 0 12px rgba(255,68,68,0.5)", label: "rgba(255,68,68,0.9)" };
  }
  switch (status) {
    case "completed": return { border: "#7DF9FF", icon: "#7DF9FF", glow: "0 0 8px rgba(125,249,255,0.3)", label: "rgba(125,249,255,0.85)" };
    case "active": return { border: "#FFB800", icon: "#FFB800", glow: "0 0 8px rgba(255,184,0,0.25)", label: "rgba(255,184,0,0.9)" };
    case "critical": return { border: "#FF4444", icon: "#FF4444", glow: "0 0 12px rgba(255,68,68,0.5)", label: "rgba(255,68,68,0.9)" };
    case "locked": return { border: "rgba(125,249,255,0.18)", icon: "rgba(125,249,255,0.2)", glow: "none", label: "rgba(125,249,255,0.25)" };
    default: return { border: "rgba(125,249,255,0.45)", icon: "rgba(125,249,255,0.55)", glow: "none", label: "rgba(125,249,255,0.6)" };
  }
};

const VectorGraphScreen = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [nodes, setNodes] = useState(() => getNodes());
  const [studyState, setStudyState] = useState(getStudyState());
  const [positions, setPositions] = useState({});
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);
  const [backendStatus, setBackendStatus] = useState("loading");

  // Inspector panel state
  const [aiSummary, setAiSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [editLabel, setEditLabel] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSaved, setEditSaved] = useState(false);

  // Add-node form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLabel, setAddLabel] = useState("");
  const [addDesc, setAddDesc] = useState("");

  // Test date
  const [testDateInput, setTestDateInput] = useState("");
  const [testDateSaved, setTestDateSaved] = useState(false);

  // PDF attach
  const attachRef = useRef(null);

  const canvasRef = useRef(null);
  const interactionRef = useRef(null);

  // ── Store subscriptions ────────────────────────────────────────────────────
  useEffect(() => subscribeNodes((updated) => setNodes([...updated])), []);
  useEffect(() => subscribeStudy((s) => setStudyState({ ...s })), []);

  useEffect(() => {
    initNodes()
      .then(() => setBackendStatus("live"))
      .catch(() => setBackendStatus("offline"));
  }, []);

  // ── Position init ──────────────────────────────────────────────────────────
  const initPositions = useCallback((nodeList) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height } = canvas.getBoundingClientRect();
    if (width === 0 || height === 0) { requestAnimationFrame(() => initPositions(nodeList)); return; }
    setPositions((prev) => {
      const next = { ...prev };
      nodeList.forEach((n) => {
        if (!next[n.id]) next[n.id] = { x: (n.x / 100) * width, y: (n.y / 100) * height };
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

  // ── Auto-select from navigation state ─────────────────────────────────────
  useEffect(() => {
    const state = location.state;
    if (!state?.newNodeId) return;
    const node = getNodes().find((n) => n.id === state.newNodeId);
    if (node) { setSelectedNode(node); centreNode(node.id); }
  }, [location.state]); // eslint-disable-line

  // ── Centre node ────────────────────────────────────────────────────────────
  const centreNode = (nodeId) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setPositions((prev) => {
      const pos = prev[nodeId];
      if (!pos) return prev;
      const { width, height } = canvas.getBoundingClientRect();
      setScale((s) => { setPan({ x: width / 2 - pos.x * s, y: height / 2 - pos.y * s }); return s; });
      return prev;
    });
  };

  // ── Pointer events ─────────────────────────────────────────────────────────
  const handleNodePointerDown = (e, node) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    interactionRef.current = {
      type: "node", nodeId: node.id,
      startMouseX: e.clientX, startMouseY: e.clientY,
      startNodeX: positions[node.id]?.x ?? 0, startNodeY: positions[node.id]?.y ?? 0,
      moved: false,
    };
  };

  const handleCanvasPointerDown = (e) => {
    if (e.target !== canvasRef.current && !e.target.closest(".graph-layer")) return;
    interactionRef.current = {
      type: "pan", startMouseX: e.clientX, startMouseY: e.clientY,
      startPanX: pan.x, startPanY: pan.y, moved: false,
    };
  };

  const handlePointerMove = (e) => {
    const ia = interactionRef.current;
    if (!ia) return;
    const dx = e.clientX - ia.startMouseX, dy = e.clientY - ia.startMouseY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) ia.moved = true;
    if (ia.type === "node") {
      setPositions((prev) => ({ ...prev, [ia.nodeId]: { x: ia.startNodeX + dx / scale, y: ia.startNodeY + dy / scale } }));
    } else if (ia.type === "pan") {
      setPan({ x: ia.startPanX + dx, y: ia.startPanY + dy });
    }
  };

  const handlePointerUp = () => {
    const ia = interactionRef.current;
    interactionRef.current = null;
    if (!ia) return;
    if (ia.type === "node" && !ia.moved) {
      const node = nodes.find((n) => n.id === ia.nodeId);
      if (node) {
        const studyNode = studyState.nodes.find((s) => s.id === node.id);
        setSelectedNode(node);
        setEditLabel(studyNode?.label || node.label);
        setEditDescription(studyNode?.description || node.data || "");
        setTestDateInput(studyNode?.testDate || "");
        setAiSummary("");
        setEditSaved(false);
        setTestDateSaved(false);
        centreNode(ia.nodeId);
      }
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
    const factor = Math.exp(-e.deltaY * ZOOM_SENSITIVITY * 2.5);
    setScale((prevScale) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prevScale * factor));
      setPan((prev) => ({ x: cx - (cx - prev.x) * (newScale / prevScale), y: cy - (cy - prev.y) * (newScale / prevScale) }));
      return newScale;
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  });

  // ── AI Summary ─────────────────────────────────────────────────────────────
  const loadSummary = async () => {
    if (!selectedNode) return;
    setSummaryLoading(true);
    try {
      const studyNode = studyState.nodes.find((s) => s.id === selectedNode.id);
      const result = await window.api.node.summary(
        selectedNode.id,
        studyNode?.label || selectedNode.label,
        studyNode?.description || selectedNode.data || ""
      );
      setAiSummary(result.summary || "No summary returned.");
    } catch (err) {
      setAiSummary(`Error: ${err.message}`);
    } finally {
      setSummaryLoading(false);
    }
  };

  // ── Node actions ───────────────────────────────────────────────────────────
  const handleSaveEdits = () => {
    if (!selectedNode) return;
    renameNode(selectedNode.id, editLabel);
    updateNodeDescription(selectedNode.id, editDescription);
    updateNodeInStore(selectedNode.id, { label: editLabel, data: editDescription });
    setEditSaved(true);
    setTimeout(() => setEditSaved(false), 2000);
  };

  const handleDeleteNode = () => {
    if (!selectedNode) return;
    if (!window.confirm(`Delete node "${selectedNode.label}"? This cannot be undone.`)) return;
    deleteNodeById(selectedNode.id);
    deleteStudyNode(selectedNode.id);
    setSelectedNode(null);
  };

  const handleAttachPdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedNode) return;
    attachFileToNode(selectedNode.id, file.name);
    e.target.value = "";
  };

  // ── Add node ───────────────────────────────────────────────────────────────
  const handleAddNode = async () => {
    if (!addLabel.trim()) return;
    const visNode = addVisualNode({ label: addLabel.trim(), data: addDesc.trim() });
    addStudyNode(addLabel.trim(), addDesc.trim());
    // Try backend
    if (window.api?.addNode) {
      try { await window.api.addNode(addLabel.trim(), ""); } catch { /* offline */ }
    }
    setAddLabel(""); setAddDesc(""); setShowAddForm(false);
    setTimeout(() => { setSelectedNode(visNode); centreNode(visNode.id); }, 100);
  };

  // ── Edge list ──────────────────────────────────────────────────────────────
  const edges = [];
  nodes.forEach((node) => {
    (node.connectedTo || []).forEach((targetId) => {
      const target = nodes.find((n) => n.id === targetId);
      if (target && positions[node.id] && positions[target.id]) {
        edges.push({ from: target, to: node });
      }
    });
  });

  const selectedStudyNode = selectedNode
    ? studyState.nodes.find((s) => s.id === selectedNode.id)
    : null;

  return (
    <div className="h-screen flex overflow-hidden bg-vector-bg text-vector-white font-terminal relative">
      <div className="scanline" />
      <Sidebar />

      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-vector-blue flex items-center justify-between px-6 backdrop-blur-md bg-vector-bg/40 z-10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-vector-white/60 font-mono tracking-wider">KNOWLEDGE_BASE</span>
            <span className="text-[12px] text-vector-blue font-bold">&gt;&gt;</span>
            <span className="text-[12px] text-vector-blue font-mono tracking-wider terminal-text">VECTOR_GRAPH</span>
          </div>
          {studyState.subject && (
            <span className="text-[11px] text-vector-white/40 font-mono">{studyState.subject}</span>
          )}
        </header>

        {/* Grid background */}
        <div className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundSize: `${32 * scale}px ${32 * scale}px`,
            backgroundPosition: `${pan.x % (32 * scale)}px ${pan.y % (32 * scale)}px`,
            backgroundImage: "linear-gradient(to right, rgba(125,249,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(125,249,255,0.04) 1px, transparent 1px)",
          }} />

        <main className="flex-1 relative flex overflow-hidden">
          {/* Canvas */}
          <div
            ref={canvasRef}
            className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
            onPointerDown={handleCanvasPointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* HUD */}
            <div className="absolute top-6 left-8 z-20 space-y-1 text-[11px] tracking-widest uppercase text-vector-blue/60 pointer-events-none">
              <p className="text-vector-blue/90">NODES: {nodes.length}</p>
              <p>LINKS: {edges.length}</p>
              <p>ZOOM: {Math.round(scale * 100)}%</p>
              <p>BACKEND: <span className={backendStatus === "live" ? "text-green-400" : backendStatus === "offline" ? "text-amber-400" : "text-vector-blue/40"}>
                {backendStatus === "live" ? "LIVE" : backendStatus === "offline" ? "OFFLINE" : "..."}
              </span></p>
            </div>

            {/* Empty state */}
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 pointer-events-none">
                <span className="material-symbols-outlined text-vector-blue/15 text-[80px]">account_tree</span>
                <p className="text-[13px] text-vector-white/20 font-mono text-center">
                  No knowledge tree yet.<br />
                  <span className="text-vector-blue/30">Upload a document in Template to build one.</span>
                </p>
              </div>
            )}

            {/* Graph layer */}
            <div className="graph-layer absolute inset-0"
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: "0 0" }}>
              {/* SVG edges */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
                <defs>
                  <filter id="vectorGlow">
                    <feGaussianBlur result="blur" stdDeviation="2.5" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                  <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto" markerUnits="strokeWidth">
                    <path d="M 0 1 L 9 5 L 0 9 z" fill="#7DF9FF" opacity="0.8" />
                  </marker>
                </defs>
                {edges.map(({ from, to }, i) => {
                  const fx = positions[from.id]?.x ?? 0, fy = positions[from.id]?.y ?? 0;
                  const tx = positions[to.id]?.x ?? 0, ty = positions[to.id]?.y ?? 0;
                  const dx = tx - fx, dy = ty - fy, dist = Math.hypot(dx, dy);
                  if (dist === 0) return null;
                  const fromR = (from.isPrimary ? 28 : 20) + 4;
                  const toR = (to.isPrimary ? 28 : 20) + 6;
                  if (dist <= fromR + toR) return null;
                  return (
                    <line key={i}
                      x1={fx + (dx / dist) * fromR} y1={fy + (dy / dist) * fromR}
                      x2={tx - (dx / dist) * toR} y2={ty - (dy / dist) * toR}
                      stroke="#7DF9FF"
                      strokeWidth={from.isPrimary ? 2 / scale : 1 / scale}
                      strokeDasharray={from.isPrimary ? "0" : `${5 / scale} ${3 / scale}`}
                      opacity={from.isPrimary ? 0.8 : 0.35}
                      filter={from.isPrimary ? "url(#vectorGlow)" : "none"}
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
                const studyNode = studyState.nodes.find((s) => s.id === node.id);
                const mastery = studyNode?.mastery ?? node.mastery;
                const colors = getNodeColors(node.status, mastery, isSelected);
                const sizePx = node.isPrimary ? 56 : 40;

                return (
                  <div key={node.id} className="absolute flex flex-col items-center"
                    style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -50%)", cursor: "grab" }}
                    onPointerDown={(e) => handleNodePointerDown(e, node)}>
                    <div className="relative">
                      <div style={{
                        width: sizePx, height: sizePx, borderWidth: node.isPrimary ? "2px" : "1px",
                        borderStyle: "solid", borderColor: colors.border, boxShadow: colors.glow
                      }}
                        className="flex items-center justify-center bg-vector-bg transition-all duration-150">
                        <span className="material-symbols-outlined"
                          style={{ fontSize: node.isPrimary ? "1.5rem" : "1.25rem", color: colors.icon }}>
                          {node.icon}
                        </span>
                      </div>
                      {isSelected && <div className="absolute inset-0 border border-vector-blue animate-ping opacity-40 pointer-events-none" />}
                      {mastery > 0 && mastery < 0.3 && !isSelected && (
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 animate-pulse" />
                      )}
                    </div>
                    <div style={{
                      marginTop: 8, padding: "2px 8px", border: `1px solid ${colors.border}`,
                      color: colors.label, fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase",
                      fontFamily: "monospace", whiteSpace: "nowrap", background: "rgba(8,2,20,0.85)"
                    }}>
                      {node.label}
                      {mastery !== null && mastery !== undefined && (
                        <span style={{ marginLeft: 6, opacity: 0.6 }}>{Math.round(mastery * 100)}%</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom-left controls */}
            <div className="absolute bottom-6 left-6 z-20 flex items-center gap-3 pointer-events-auto">
              <button
                onClick={() => setShowAddForm(true)}
                className="border border-vector-blue bg-vector-blue/10 px-5 py-2 flex items-center gap-2 hover:bg-vector-blue/30 transition-all text-vector-white text-[11px] tracking-widest uppercase"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                ADD NODE
              </button>
            </div>

            {/* Bottom-right zoom controls */}
            <div className="absolute bottom-6 right-6 z-20 pointer-events-auto">
              <div className="flex flex-col border border-vector-blue/30 divide-y divide-vector-blue/30">
                <button onClick={() => { setPan({ x: 0, y: 0 }); setScale(1); }}
                  className="p-1 hover:bg-vector-blue/10 text-vector-blue/70 hover:text-vector-blue transition-colors" title="Recenter">
                  <span className="material-symbols-outlined text-[20px]">filter_center_focus</span>
                </button>
                <button onClick={() => setScale((s) => Math.min(MAX_SCALE, s * 1.25))}
                  className="p-1 hover:bg-vector-blue/10 text-vector-blue/70 hover:text-vector-blue transition-colors">
                  <span className="material-symbols-outlined text-[20px]">add</span>
                </button>
                <button onClick={() => setScale((s) => Math.max(MIN_SCALE, s / 1.25))}
                  className="p-1 hover:bg-vector-blue/10 text-vector-blue/70 hover:text-vector-blue transition-colors">
                  <span className="material-symbols-outlined text-[20px]">remove</span>
                </button>
              </div>
            </div>
          </div>

          {/* ── NODE INSPECTOR PANEL ── */}
          {selectedNode && (
            <div className="w-80 flex-shrink-0 border-l border-vector-blue bg-vector-bg/95 backdrop-blur-md flex flex-col overflow-hidden z-30">
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-vector-blue/30 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-vector-blue text-sm">settings</span>
                  <span className="text-[11px] text-vector-blue tracking-widest uppercase font-bold">NODE_INSPECTOR</span>
                </div>
                <button onClick={() => setSelectedNode(null)} className="text-vector-white/30 hover:text-vector-white transition-colors">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Node identity */}
                <div className="px-4 py-3 border-b border-vector-blue/20">
                  <p className="text-[10px] text-vector-blue/40 font-mono tracking-widest uppercase mb-2">{selectedNode.id}</p>
                  {selectedStudyNode && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-mono text-vector-white/40">MASTERY</span>
                        <span className="text-[10px] font-mono" style={{
                          color: selectedStudyNode.mastery >= 0.7 ? "#7DF9FF" : selectedStudyNode.mastery >= 0.3 ? "#FFB800" : "#FF4444"
                        }}>{Math.round(selectedStudyNode.mastery * 100)}%</span>
                      </div>
                      <div className="h-1.5 bg-vector-white/5">
                        <div className="h-full transition-all duration-500" style={{
                          width: `${selectedStudyNode.mastery * 100}%`,
                          background: selectedStudyNode.mastery >= 0.7 ? "#7DF9FF" : selectedStudyNode.mastery >= 0.3 ? "#FFB800" : "#FF4444",
                        }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Test Date */}
                <div className="px-4 py-3 border-b border-vector-blue/20">
                  <p className="text-[11px] text-vector-blue/50 font-mono tracking-widest uppercase mb-2">TEST_DATE</p>
                  {(() => {
                    const days = selectedStudyNode?.testDate ? getDaysToTest(selectedStudyNode) : null;
                    return (
                      <div className="flex flex-col gap-2">
                        {days !== null && (
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm"
                              style={{ color: days <= 0 ? "#FF4444" : days <= 3 ? "#FF4444" : days <= 7 ? "#FFB800" : "#7DF9FF" }}>
                              event
                            </span>
                            <span className="text-[12px] font-mono"
                              style={{ color: days <= 0 ? "#FF4444" : days <= 3 ? "#FF4444" : days <= 7 ? "#FFB800" : "#7DF9FF" }}>
                              {days <= 0 ? "TODAY / OVERDUE" : `In ${days} day${days !== 1 ? "s" : ""}`}
                            </span>
                          </div>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={testDateInput}
                            onChange={(e) => { setTestDateInput(e.target.value); setTestDateSaved(false); }}
                            className="flex-1 bg-black/60 border border-vector-blue/20 px-2 py-1.5 text-vector-white/80 text-[11px] font-mono outline-none focus:border-vector-blue/60 transition-colors"
                            style={{ colorScheme: "dark" }}
                          />
                          <button
                            onClick={() => {
                              setTestDate(selectedNode.id, testDateInput || null);
                              setTestDateSaved(true);
                              setTimeout(() => setTestDateSaved(false), 2000);
                            }}
                            className={`px-3 py-1.5 text-[11px] font-mono tracking-widest uppercase border transition-all
                              ${testDateSaved ? "border-green-500/60 bg-green-500/10 text-green-400" : "border-vector-blue/40 text-vector-blue hover:bg-vector-blue/20"}`}
                          >
                            {testDateSaved ? "✓" : "SET"}
                          </button>
                          {testDateInput && (
                            <button
                              onClick={() => { setTestDateInput(""); setTestDate(selectedNode.id, null); }}
                              className="px-2 py-1.5 text-[11px] font-mono border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-all"
                              title="Clear test date"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-vector-white/30 font-mono">
                          Nodes with upcoming tests get higher dashboard priority.
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {/* AI Summary */}
                <div className="px-4 py-3 border-b border-vector-blue/20">
                  <p className="text-[10px] text-vector-blue/40 font-mono tracking-widest uppercase mb-2">AI_SUMMARY</p>
                  {!aiSummary && !summaryLoading && (
                    <button
                      onClick={loadSummary}
                      className="w-full py-2 border border-vector-blue/40 text-vector-blue text-[11px] font-mono tracking-widest uppercase hover:bg-vector-blue/10 transition-all flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">auto_awesome</span>
                      GENERATE SUMMARY
                    </button>
                  )}
                  {summaryLoading && (
                    <div className="flex items-center gap-2 py-2">
                      <span className="material-symbols-outlined text-vector-blue text-sm animate-spin">refresh</span>
                      <span className="text-[11px] text-vector-blue/60 font-mono">Generating...</span>
                    </div>
                  )}
                  {aiSummary && (
                    <p className="text-[9px] text-vector-white/70 font-mono leading-relaxed">{aiSummary}</p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="px-4 py-3 border-b border-vector-blue/20 flex flex-col gap-2">
                  <button
                    onClick={() => navigate(`/quiz?node=${encodeURIComponent(selectedNode.id)}`)}
                    className="w-full py-2 border border-vector-blue/50 bg-vector-blue/10 text-vector-blue text-[11px] font-mono tracking-widest uppercase hover:bg-vector-blue/30 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">psychology</span>
                    TAKE QUIZ
                  </button>
                  <button
                    onClick={() => attachRef.current?.click()}
                    className="w-full py-2 border border-vector-white/20 text-vector-white/60 text-[11px] font-mono tracking-widest uppercase hover:border-vector-blue hover:text-vector-blue transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">attach_file</span>
                    ATTACH PDF
                  </button>
                  <input ref={attachRef} type="file" accept=".pdf" className="hidden" onChange={handleAttachPdf} />
                  <button
                    onClick={handleDeleteNode}
                    className="w-full py-2 border border-red-500/30 text-red-400 text-[11px] font-mono tracking-widest uppercase hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    DELETE NODE
                  </button>
                </div>

                {/* Attached files */}
                {selectedStudyNode?.attachedFiles?.length > 0 && (
                  <div className="px-4 py-3 border-b border-vector-blue/20">
                    <p className="text-[10px] text-vector-blue/40 font-mono tracking-widest uppercase mb-2">ATTACHED_FILES</p>
                    <div className="flex flex-col gap-1">
                      {selectedStudyNode.attachedFiles.map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] font-mono text-vector-white/60">
                          <span className="material-symbols-outlined text-red-400 text-sm">picture_as_pdf</span>
                          <span className="truncate">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edit section */}
                <div className="px-4 py-3 flex flex-col gap-3">
                  <p className="text-[10px] text-vector-blue/40 font-mono tracking-widest uppercase">EDIT_NODE</p>
                  <div>
                    <label className="text-[10px] text-vector-white/30 font-mono uppercase tracking-widest block mb-1">Label</label>
                    <input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="w-full bg-black/60 border border-vector-blue/20 px-3 py-2 text-vector-white/80 text-[12px] font-mono outline-none focus:border-vector-blue/60 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-vector-white/30 font-mono uppercase tracking-widest block mb-1">Description</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={4}
                      className="w-full bg-black/60 border border-vector-blue/20 px-3 py-2 text-vector-white/70 text-[12px] font-mono leading-relaxed resize-none outline-none focus:border-vector-blue/60 transition-colors"
                    />
                  </div>
                  <button
                    onClick={handleSaveEdits}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 border transition-all text-[11px] tracking-widest uppercase font-mono
                      ${editSaved ? "border-green-500/60 bg-green-500/10 text-green-400" : "border-vector-blue/40 bg-vector-blue/5 hover:bg-vector-blue/20 text-vector-blue"}`}
                  >
                    <span className="material-symbols-outlined text-sm">{editSaved ? "check_circle" : "save"}</span>
                    {editSaved ? "SAVED" : "SAVE CHANGES"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Node Form Overlay */}
      {showAddForm && (
        <div className="absolute inset-0 z-50 bg-vector-bg/70 backdrop-blur-sm flex items-center justify-center">
          <div className="w-96 border border-vector-blue bg-vector-bg shadow-card-glow">
            <div className="flex items-center justify-between px-5 py-4 border-b border-vector-blue/30">
              <span className="text-[12px] text-vector-blue font-mono tracking-widest uppercase font-bold">ADD_NODE</span>
              <button onClick={() => { setShowAddForm(false); setAddLabel(""); setAddDesc(""); }}
                className="text-vector-white/30 hover:text-vector-white transition-colors">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="text-[11px] text-vector-white/40 font-mono uppercase tracking-widest block mb-1">Node Label *</label>
                <input
                  value={addLabel}
                  onChange={(e) => setAddLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddNode()}
                  placeholder="e.g. Bayes Theorem"
                  className="w-full bg-black/60 border border-vector-blue/30 px-3 py-2.5 text-vector-white text-[13px] font-mono outline-none focus:border-vector-blue transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[11px] text-vector-white/40 font-mono uppercase tracking-widest block mb-1">Description (optional)</label>
                <textarea
                  value={addDesc}
                  onChange={(e) => setAddDesc(e.target.value)}
                  rows={3}
                  placeholder="Brief description of this topic..."
                  className="w-full bg-black/60 border border-vector-blue/30 px-3 py-2 text-vector-white/70 text-[12px] font-mono leading-relaxed resize-none outline-none focus:border-vector-blue transition-colors"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleAddNode}
                  disabled={!addLabel.trim()}
                  className="flex-1 py-3 bg-vector-blue text-vector-bg text-[12px] font-bold tracking-widest uppercase font-mono hover:brightness-110 transition-all disabled:opacity-40"
                >
                  ADD TO TREE
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setAddLabel(""); setAddDesc(""); }}
                  className="px-4 py-3 border border-vector-blue/30 text-vector-blue text-[12px] font-mono tracking-widest uppercase hover:bg-vector-blue/10 transition-all"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VectorGraphScreen;
