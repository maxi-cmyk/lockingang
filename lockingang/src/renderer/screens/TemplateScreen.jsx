import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import { getNodes } from "../nodeStore";

const ACCEPTED_TYPES = [
    { ext: "md", label: "MARKDOWN", icon: "description", color: "text-vector-blue" },
    { ext: "pdf", label: "PDF", icon: "picture_as_pdf", color: "text-red-400" },
    { ext: "png,jpg,jpeg,webp", label: "IMAGE", icon: "image", color: "text-purple-400" },
    { ext: "txt", label: "PLAINTEXT", icon: "article", color: "text-green-400" },
];

const EXT_TO_TYPE = { md: "markdown", txt: "plaintext", pdf: "pdf", png: "image", jpg: "image", jpeg: "image", webp: "image" };

const DEMO_FILES = [
    { id: "df1", name: "CS105_lecture_week1.pdf",        type: "pdf",      size: 2400000 },
    { id: "df2", name: "CS105_lecture_week2.pdf",        type: "pdf",      size: 1900000 },
    { id: "df3", name: "marty_notes_handwritten.png",    type: "image",    size: 870000  },
    { id: "df4", name: "stats_past_paper_2024.pdf",      type: "pdf",      size: 3100000 },
    { id: "df5", name: "probability_cheatsheet.md",      type: "markdown", size: 45000   },
];

const DEMO_NODES = [
    "PROBABILITY",
    "CONDITIONAL_PROB",
    "BAYES_THEOREM",
    "EXPECTATION_VARIANCE",
    "COMMON_DISTRIBUTIONS",
    "NORMAL_DIST",
    "BINOMIAL_DIST",
    "HYPOTHESIS_TESTING",
    "CENTRAL_LIMIT_THEOREM",
    "BAYESIAN_INFERENCE",
    "CS105_STATS (root)",
];

const SCAN_LINES = [
    "INITIALISING NLP PIPELINE...",
    "LOADING EMBEDDING MODEL: llama-text-embed-v2",
    "EXTRACTING TEXT FROM 5 FILES...",
    "CHUNKING: 400-word windows, 50-word overlap",
    "EMBEDDING CHUNKS INTO VECTOR SPACE...",
    "CLUSTERING SEMANTIC CONCEPTS...",
    "IDENTIFYING PREREQUISITE RELATIONSHIPS...",
    "BUILDING KNOWLEDGE GRAPH...",
    "GENERATING NODE DESCRIPTIONS...",
    "FINALISING EDGE WEIGHTS...",
];

const fmtSize = (b) => b >= 1e6 ? `${(b / 1e6).toFixed(1)}MB` : `${(b / 1e3).toFixed(0)}KB`;

const TemplateScreen = () => {
    const navigate = useNavigate();
    const nodes = getNodes();
    const defaultId = nodes.find((n) => n.isPrimary)?.id ?? nodes[0]?.id ?? "";
    const [selectedNodeId, setSelectedNodeId] = useState(defaultId);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    // Demo analysis state
    const [demoPhase, setDemoPhase] = useState("idle"); // idle | loading | complete
    const [scanLog, setScanLog] = useState([]);
    const [discoveredNodes, setDiscoveredNodes] = useState([]);
    const [scanLineIdx, setScanLineIdx] = useState(0);
    const [nodeIdx, setNodeIdx] = useState(0);
    const logRef = useRef(null);

    const selectedNode = nodes.find((n) => n.id === selectedNodeId);

    const getFileType = (filename) => { const ext = filename.split(".").pop().toLowerCase(); return EXT_TO_TYPE[ext] ?? null; };
    const isAccepted = (filename) => getFileType(filename) !== null;

    const processFiles = (files) => {
        const newEntries = Array.from(files).filter((f) => isAccepted(f.name)).map((f) => ({
            id: `${Date.now()}_${f.name}`, name: f.name, type: getFileType(f.name),
            size: f.size, file: f, status: "pending", message: "",
        }));
        setUploadedFiles((prev) => [...prev, ...newEntries]);
    };

    const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); processFiles(e.dataTransfer.files); };
    const removeFile = (id) => setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
    const clearDone = () => setUploadedFiles((prev) => prev.filter((f) => f.status !== "done"));
    const pendingCount = uploadedFiles.filter((f) => f.status === "pending").length;
    const doneCount = uploadedFiles.filter((f) => f.status === "done").length;

    // ── DEMO: load preset files ───────────────────────────────────────────────
    const loadDemoFiles = () => {
        setUploadedFiles(DEMO_FILES.map((f) => ({ ...f, status: "pending", message: "" })));
    };

    // ── DEMO: run analysis animation ─────────────────────────────────────────
    const runDemoAnalysis = () => {
        if (uploadedFiles.length === 0) { loadDemoFiles(); return; }
        setDemoPhase("loading");
        setScanLog([]);
        setDiscoveredNodes([]);
        setScanLineIdx(0);
        setNodeIdx(0);
        // Mark all as uploading
        setUploadedFiles((prev) => prev.map((f) => ({ ...f, status: "uploading" })));
    };

    // Drive the scan log animation
    useEffect(() => {
        if (demoPhase !== "loading") return;
        if (scanLineIdx < SCAN_LINES.length) {
            const t = setTimeout(() => {
                setScanLog((prev) => [...prev, SCAN_LINES[scanLineIdx]]);
                setScanLineIdx((i) => i + 1);
            }, 350 + Math.random() * 200);
            return () => clearTimeout(t);
        }
    }, [demoPhase, scanLineIdx]);

    // Drive the node discovery animation
    useEffect(() => {
        if (demoPhase !== "loading") return;
        if (scanLineIdx < 5) return; // wait for scan to progress
        if (nodeIdx < DEMO_NODES.length) {
            const t = setTimeout(() => {
                setDiscoveredNodes((prev) => [...prev, DEMO_NODES[nodeIdx]]);
                setNodeIdx((i) => i + 1);
            }, 400);
            return () => clearTimeout(t);
        } else if (scanLineIdx >= SCAN_LINES.length) {
            // All done
            const t = setTimeout(() => {
                setDemoPhase("complete");
                setUploadedFiles((prev) => prev.map((f) => ({ ...f, status: "done", message: "Indexed" })));
            }, 600);
            return () => clearTimeout(t);
        }
    }, [demoPhase, scanLineIdx, nodeIdx]);

    // Auto-scroll log
    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [scanLog]);

    const handleUploadAll = async () => {
        const pending = uploadedFiles.filter((f) => f.status === "pending");
        if (!pending.length) return;
        runDemoAnalysis();
    };

    return (
        <div className="h-screen flex overflow-hidden bg-vector-bg text-vector-white font-terminal relative">
            <div className="scanline" />
            <Sidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 custom-scrollbar">
                    <div>
                        <h1 className="text-2xl font-bold tracking-widest text-vector-white uppercase terminal-text"
                            style={{ textShadow: "0 0 20px rgba(125,249,255,0.4)" }}>
                            UPLOAD_TEMPLATE
                        </h1>
                        <p className="text-[10px] text-vector-blue/60 font-mono tracking-wider mt-1">
                            Drop your study materials. The AI reads everything and builds your knowledge tree automatically.
                        </p>
                    </div>

                    {/* Demo quick-load banner */}
                    {demoPhase === "idle" && uploadedFiles.length === 0 && (
                        <div className="border border-vector-blue/30 bg-vector-blue/5 p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[9px] text-vector-blue font-mono tracking-widest uppercase">DEMO: CS105 Course Materials</p>
                                <p className="text-[8px] text-vector-white/40 font-mono mt-0.5">Load Marty's lecture PDFs, handwritten notes and past papers</p>
                            </div>
                            <button
                                onClick={loadDemoFiles}
                                className="px-4 py-2 border border-vector-blue text-vector-blue text-[8px] font-mono tracking-widest uppercase hover:bg-vector-blue/20 transition-all flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                                <p>LOAD FILES</p>
                            </button>
                        </div>
                    )}

                    {/* Main grid - hide when analysis complete */}
                    {demoPhase !== "complete" && (
                        <div className="grid grid-cols-[1fr_320px] gap-6">
                            <div className="flex flex-col gap-5">

                                {/* Drop zone */}
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`relative border-2 border-dashed p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all
                                        ${isDragging ? "border-vector-blue bg-vector-blue/10" : "border-vector-blue/30 hover:border-vector-blue/60 hover:bg-vector-blue/5"}`}
                                    style={isDragging ? { boxShadow: "0 0 40px rgba(125,249,255,0.2)" } : {}}
                                >
                                    <input ref={fileInputRef} type="file" multiple accept=".md,.txt,.pdf,.png,.jpg,.jpeg,.webp"
                                        className="hidden" onChange={(e) => processFiles(e.target.files)} />
                                    <span className="material-symbols-outlined text-[48px] transition-colors"
                                        style={{ color: isDragging ? "#7DF9FF" : "rgba(125,249,255,0.3)" }}>cloud_upload</span>
                                    <div className="text-center">
                                        <p className="text-[11px] text-vector-white tracking-widest uppercase font-mono">DROP FILES HERE</p>
                                        <p className="text-[9px] text-vector-white/40 font-mono mt-1">or click to browse · PDF, MD, IMG, TXT</p>
                                    </div>
                                    {isDragging && <div className="absolute inset-0 border-2 border-vector-blue animate-ping opacity-20 pointer-events-none" />}
                                </div>

                                {/* File queue */}
                                {uploadedFiles.length > 0 && (
                                    <div className="border border-vector-blue/30 bg-black/20">
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-vector-blue/20">
                                            <span className="text-[8px] text-vector-blue/60 uppercase tracking-widest font-mono">
                                                QUEUE ({uploadedFiles.length}) — {doneCount} INDEXED
                                            </span>
                                            {doneCount > 0 && (
                                                <button onClick={clearDone} className="text-[8px] text-vector-white/30 hover:text-vector-blue font-mono uppercase tracking-widest transition-colors">
                                                    <p>CLEAR DONE</p>
                                                </button>
                                            )}
                                        </div>
                                        <div className="divide-y divide-vector-blue/10">
                                            {uploadedFiles.map((f) => (
                                                <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                                                    <span className={`material-symbols-outlined text-[18px] ${
                                                        f.status === "done" ? "text-green-400" :
                                                        f.status === "error" ? "text-red-400" :
                                                        f.status === "uploading" ? "text-vector-blue animate-spin" :
                                                        "text-vector-white/30"}`}>
                                                        {f.status === "done" ? "check_circle" : f.status === "error" ? "error" :
                                                         f.status === "uploading" ? "refresh" : "schedule"}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[10px] text-vector-white font-mono truncate">{f.name}</p>
                                                        {f.message && <p className="text-[8px] text-vector-white/40 font-mono mt-0.5">{f.message}</p>}
                                                    </div>
                                                    <span className="text-[8px] text-vector-white/30 font-mono uppercase shrink-0">{fmtSize(f.size)}</span>
                                                    {f.status === "pending" && (
                                                        <button onClick={() => removeFile(f.id)} className="text-vector-white/20 hover:text-red-400 transition-colors">
                                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="px-4 py-3 border-t border-vector-blue/20">
                                            <button
                                                onClick={handleUploadAll}
                                                disabled={pendingCount === 0 || demoPhase === "loading"}
                                                className="w-full py-3 bg-vector-blue text-vector-bg text-[9px] uppercase tracking-widest font-bold font-mono hover:brightness-110 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-sm">
                                                    {demoPhase === "loading" ? "hourglass_top" : "auto_awesome"}
                                                </span>
                                                <p>{demoPhase === "loading" ? "ANALYSING..." : `BUILD KNOWLEDGE TREE (${pendingCount} FILE${pendingCount !== 1 ? "S" : ""})`}</p>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Scan log */}
                                {demoPhase === "loading" && scanLog.length > 0 && (
                                    <div className="border border-vector-blue/20 bg-black/60">
                                        <div className="px-4 py-2 border-b border-vector-blue/20">
                                            <span className="text-[8px] text-vector-blue/60 font-mono tracking-widest uppercase">AI_PIPELINE_LOG</span>
                                        </div>
                                        <div ref={logRef} className="p-4 max-h-36 overflow-y-auto custom-scrollbar font-mono text-[9px] space-y-1">
                                            {scanLog.map((line, i) => (
                                                <div key={i} className="flex items-center gap-2 text-vector-blue/70">
                                                    <span className="text-vector-blue/30">&gt;</span>
                                                    <span>{line}</span>
                                                </div>
                                            ))}
                                            {demoPhase === "loading" && (
                                                <div className="flex items-center gap-2 text-vector-blue/40">
                                                    <span>&gt;</span>
                                                    <span className="animate-pulse">_</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right column */}
                            <div className="flex flex-col gap-4">
                                <div className="border border-vector-blue/30 bg-black/20 p-5">
                                    <p className="text-[8px] text-vector-blue/50 uppercase tracking-widest font-mono mb-4">ACCEPTED_FORMATS</p>
                                    <div className="flex flex-col gap-3">
                                        {ACCEPTED_TYPES.map(({ ext, label, icon, color }) => (
                                            <div key={label} className="flex items-center gap-3 p-3 border border-vector-blue/15">
                                                <span className={`material-symbols-outlined text-[20px] ${color}`}>{icon}</span>
                                                <div>
                                                    <p className={`text-[9px] font-bold uppercase tracking-widest font-mono ${color}`}>{label}</p>
                                                    <p className="text-[8px] text-vector-white/30 font-mono">.{ext.replace(",", " .")}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="border border-vector-blue/20 bg-black/10 p-5">
                                    <p className="text-[8px] text-vector-blue/50 uppercase tracking-widest font-mono mb-3">PIPELINE_OVERVIEW</p>
                                    {[
                                        { step: "01", label: "TEXT_EXTRACT", desc: "Read file content (PDF/OCR for images)" },
                                        { step: "02", label: "CHUNK", desc: "400-word windows, 50-word overlap" },
                                        { step: "03", label: "EMBED", desc: "768-float vectors via Transformers.js" },
                                        { step: "04", label: "CONCEPT_MAP", desc: "Cluster semantics → identify nodes" },
                                        { step: "05", label: "FAISS_INDEX", desc: "Per-node IndexFlatIP for RAG queries" },
                                    ].map(({ step, label, desc }) => (
                                        <div key={step} className="flex gap-3 mb-3 last:mb-0">
                                            <span className="text-[8px] text-vector-blue/40 font-mono shrink-0 pt-0.5">{step}</span>
                                            <div>
                                                <p className="text-[8px] text-vector-blue font-mono uppercase tracking-widest">{label}</p>
                                                <p className="text-[8px] text-vector-white/30 font-mono">{desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Live node discovery panel */}
                                {demoPhase === "loading" && discoveredNodes.length > 0 && (
                                    <div className="border border-vector-blue/30 bg-black/20 p-4">
                                        <p className="text-[8px] text-vector-blue/50 uppercase tracking-widest font-mono mb-3">
                                            NODES_DISCOVERED ({discoveredNodes.length}/{DEMO_NODES.length})
                                        </p>
                                        <div className="flex flex-col gap-1.5">
                                            {discoveredNodes.map((n) => (
                                                <div key={n} className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                                                    <span className="text-[9px] font-mono text-vector-white/70">{n}</span>
                                                </div>
                                            ))}
                                            {nodeIdx < DEMO_NODES.length && (
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-vector-blue text-sm animate-spin">refresh</span>
                                                    <span className="text-[9px] font-mono text-vector-blue/50 animate-pulse">scanning...</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── COMPLETE STATE ── */}
                    {demoPhase === "complete" && (
                        <div className="flex flex-col gap-6">
                            {/* Success banner */}
                            <div className="border border-green-500/50 bg-green-500/5 p-6 relative overflow-hidden"
                                style={{ boxShadow: "0 0 30px rgba(74,222,128,0.1)" }}>
                                <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
                                <div className="flex items-start gap-4">
                                    <span className="material-symbols-outlined text-green-400 text-4xl">check_circle</span>
                                    <div>
                                        <h2 className="text-lg font-bold text-green-400 tracking-widest terminal-text uppercase">
                                            KNOWLEDGE TREE GENERATED
                                        </h2>
                                        <p className="text-[10px] text-vector-white/60 font-mono mt-1">
                                            AI analysed 5 files · identified 11 core concepts · built 11 prerequisite edges
                                        </p>
                                        <div className="flex gap-6 mt-3">
                                            <div>
                                                <p className="text-[8px] text-vector-white/40 font-mono uppercase tracking-widest">Nodes Created</p>
                                                <p className="text-2xl font-bold text-green-400 font-mono">11</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] text-vector-white/40 font-mono uppercase tracking-widest">Edges Mapped</p>
                                                <p className="text-2xl font-bold text-green-400 font-mono">11</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] text-vector-white/40 font-mono uppercase tracking-widest">Chunks Indexed</p>
                                                <p className="text-2xl font-bold text-green-400 font-mono">247</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Node list */}
                            <div className="border border-vector-blue/20 bg-black/20">
                                <div className="px-4 py-3 border-b border-vector-blue/20">
                                    <span className="text-[8px] text-vector-blue/60 font-mono tracking-widest uppercase">GENERATED_NODES</span>
                                </div>
                                <div className="grid grid-cols-2 divide-x divide-vector-blue/10">
                                    {DEMO_NODES.map((n) => (
                                        <div key={n} className="flex items-center gap-2 px-4 py-2.5 border-b border-vector-blue/10">
                                            <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                                            <span className="text-[9px] font-mono text-vector-white/70">{n}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => navigate("/knowledge-tree")}
                                    className="flex-1 py-4 bg-vector-blue text-vector-bg text-[10px] font-bold tracking-widest uppercase font-mono hover:brightness-110 transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined">account_tree</span>
                                    <p>VIEW KNOWLEDGE TREE</p>
                                </button>
                                <button
                                    onClick={() => { setDemoPhase("idle"); setUploadedFiles([]); setScanLog([]); setDiscoveredNodes([]); }}
                                    className="px-6 py-4 border border-vector-blue/30 text-vector-blue text-[9px] font-mono tracking-widest uppercase hover:bg-vector-blue/10 transition-all"
                                >
                                    <p>RESET</p>
                                </button>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default TemplateScreen;
