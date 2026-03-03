import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import { initFromTree } from "../studyStore";
import { loadTreeIntoStore } from "../nodeStore";

// ── Constants ─────────────────────────────────────────────────────────────────

const ACCEPTED_TYPES = [
    { ext: "pdf",      label: "PDF",       icon: "picture_as_pdf", color: "text-red-400"    },
    { ext: "md",       label: "MARKDOWN",  icon: "description",    color: "text-vector-blue" },
    { ext: "txt",      label: "PLAINTEXT", icon: "article",        color: "text-green-400"  },
    { ext: "docx",     label: "WORD",      icon: "description",    color: "text-blue-400"   },
];

const EXT_TO_MIME = {
    pdf:  "application/pdf",
    md:   "text/markdown",
    txt:  "text/plain",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

const TREE_ACCEPTED = new Set([".pdf", ".md", ".txt", ".docx"]);

// Animated scan lines shown while OpenAI is working
const SCAN_LINES = [
    "INITIALISING NLP PIPELINE...",
    "EXTRACTING TEXT FROM DOCUMENT...",
    "CHUNKING: 600-char windows, 100-char overlap",
    "EMBEDDING CHUNKS INTO PINECONE VECTOR DB...",
    "QUERYING GPT-4o FOR CONCEPT EXTRACTION...",
    "IDENTIFYING PREREQUISITE RELATIONSHIPS...",
    "BUILDING KNOWLEDGE GRAPH STRUCTURE...",
    "GENERATING NODE DESCRIPTIONS...",
    "FINALISING EDGE WEIGHTS...",
    "PUSHING TREE TO KNOWLEDGE BASE...",
];

const fmtSize = (b) => b >= 1e6 ? `${(b / 1e6).toFixed(1)}MB` : `${(b / 1e3).toFixed(0)}KB`;

// ── Component ─────────────────────────────────────────────────────────────────

const TemplateScreen = () => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const logRef       = useRef(null);

    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [isDragging,    setIsDragging]    = useState(false);

    // Pipeline state
    const [phase,        setPhase]        = useState("idle");  // idle | loading | complete | error
    const [scanLog,      setScanLog]      = useState([]);
    const [scanLineIdx,  setScanLineIdx]  = useState(0);
    const [result,       setResult]       = useState(null);    // { subject, nodes, edges }
    const [errorMsg,     setErrorMsg]     = useState("");
    const [liveNodes,    setLiveNodes]    = useState([]);      // nodes revealed one-by-one

    // ── File handling ─────────────────────────────────────────────────────────

    const getExt  = (name) => name.split(".").pop().toLowerCase();
    const isValid = (name) => TREE_ACCEPTED.has("." + getExt(name));

    const processFiles = (files) => {
        const entries = Array.from(files)
            .filter((f) => isValid(f.name))
            .map((f) => ({
                id: `${Date.now()}_${f.name}`, name: f.name,
                size: f.size, file: f, status: "pending", message: "",
            }));
        if (entries.length === 0) {
            alert("No supported files. Please use PDF, MD, TXT, or DOCX.");
            return;
        }
        setUploadedFiles((prev) => [...prev, ...entries]);
    };

    const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); processFiles(e.dataTransfer.files); };
    const removeFile = (id) => setUploadedFiles((prev) => prev.filter((f) => f.id !== id));

    const pendingCount = uploadedFiles.filter((f) => f.status === "pending").length;
    const doneCount    = uploadedFiles.filter((f) => f.status === "done").length;

    // ── Scan-log animation (driven while phase === "loading") ─────────────────

    useEffect(() => {
        if (phase !== "loading") return;
        if (scanLineIdx >= SCAN_LINES.length) return;
        const t = setTimeout(() => {
            setScanLog((prev) => [...prev, SCAN_LINES[scanLineIdx]]);
            setScanLineIdx((i) => i + 1);
        }, 600 + Math.random() * 400);
        return () => clearTimeout(t);
    }, [phase, scanLineIdx]);

    // Auto-scroll log
    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [scanLog]);

    // ── Real build pipeline ───────────────────────────────────────────────────

    const handleBuild = async () => {
        const pending = uploadedFiles.filter((f) => f.status === "pending" && f.file instanceof File);
        if (pending.length === 0) return;

        // Pick the first valid file (the one to build the tree from)
        const primary = pending[0];

        setPhase("loading");
        setScanLog([]);
        setScanLineIdx(0);
        setLiveNodes([]);
        setResult(null);
        setErrorMsg("");
        setUploadedFiles((prev) =>
            prev.map((f) => f.id === primary.id ? { ...f, status: "uploading" } : f)
        );

        try {
            const buffer = await primary.file.arrayBuffer();
            const mime   = EXT_TO_MIME[getExt(primary.name)] || "application/octet-stream";
            const data   = await window.api.template.buildTree(buffer, primary.name, mime);

            setResult(data);
            setUploadedFiles((prev) =>
                prev.map((f) => f.id === primary.id ? { ...f, status: "done", message: "Indexed" } : f)
            );

            // Populate study store + visual node store with the real tree data
            initFromTree({ subject: data.subject, nodes: data.nodes, edges: data.edges });
            loadTreeIntoStore(data.nodes, data.edges);

            // Reveal nodes one-by-one for the cinematic feel
            for (let i = 0; i < data.nodes.length; i++) {
                await new Promise((r) => setTimeout(r, 220));
                setLiveNodes((prev) => [...prev, data.nodes[i]]);
            }

            setPhase("complete");
        } catch (err) {
            setErrorMsg(err.message || "Unknown error");
            setPhase("error");
            setUploadedFiles((prev) =>
                prev.map((f) => f.id === primary.id ? { ...f, status: "error", message: "Failed" } : f)
            );
        }
    };

    const reset = () => {
        setPhase("idle");
        setUploadedFiles([]);
        setScanLog([]);
        setScanLineIdx(0);
        setLiveNodes([]);
        setResult(null);
        setErrorMsg("");
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="h-screen flex overflow-hidden bg-vector-bg text-vector-white font-terminal relative">
            <div className="scanline" />
            <Sidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="h-14 border-b border-vector-blue flex items-center justify-between px-6 backdrop-blur-md bg-vector-bg/40 z-10 shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-vector-white/60 font-mono tracking-wider">KNOWLEDGE_BASE</span>
                        <span className="text-[10px] text-vector-blue font-bold">&gt;&gt;</span>
                        <span className="text-[10px] text-vector-blue font-mono tracking-wider terminal-text">TEMPLATE_UPLOADER</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {phase === "loading" && (
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-vector-blue animate-ping" />
                                <span className="text-[8px] text-vector-blue font-mono tracking-widest">ANALYSING...</span>
                            </div>
                        )}
                        {phase === "complete" && (
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-green-400" />
                                <span className="text-[8px] text-green-400 font-mono tracking-widest">TREE GENERATED</span>
                            </div>
                        )}
                        {phase === "error" && (
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-red-400" />
                                <span className="text-[8px] text-red-400 font-mono tracking-widest">ERROR</span>
                            </div>
                        )}
                        {phase === "idle" && (
                            <div className="flex items-center gap-1.5">
                                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[8px] text-vector-white/40 font-mono tracking-widest">RAG_PIPELINE READY</span>
                            </div>
                        )}
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-8 flex flex-col gap-6 custom-scrollbar">
                    <div>
                        <h1 className="text-2xl font-bold tracking-widest text-vector-white uppercase terminal-text"
                            style={{ textShadow: "0 0 20px rgba(125,249,255,0.4)" }}>
                            UPLOAD_TEMPLATE
                        </h1>
                        <p className="text-[10px] text-vector-blue/60 font-mono tracking-wider mt-1">
                            Drop a study document. GPT-4o reads it and builds your knowledge tree automatically.
                        </p>
                    </div>

                    {/* ── IDLE / LOADING ── */}
                    {phase !== "complete" && (
                        <div className="grid grid-cols-[1fr_320px] gap-6">
                            <div className="flex flex-col gap-5">

                                {/* Drop zone */}
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={handleDrop}
                                    onClick={() => phase === "idle" && fileInputRef.current?.click()}
                                    className={`relative border-2 border-dashed p-12 flex flex-col items-center justify-center gap-4 transition-all
                                        ${phase === "idle" ? "cursor-pointer" : "cursor-default opacity-50 pointer-events-none"}
                                        ${isDragging ? "border-vector-blue bg-vector-blue/10" : "border-vector-blue/30 hover:border-vector-blue/60 hover:bg-vector-blue/5"}`}
                                    style={isDragging ? { boxShadow: "0 0 40px rgba(125,249,255,0.2)" } : {}}
                                >
                                    <input ref={fileInputRef} type="file"
                                        accept=".pdf,.md,.txt,.docx"
                                        className="hidden"
                                        onChange={(e) => processFiles(e.target.files)} />
                                    <span className="material-symbols-outlined text-[48px] transition-colors"
                                        style={{ color: isDragging ? "#7DF9FF" : "rgba(125,249,255,0.3)" }}>
                                        cloud_upload
                                    </span>
                                    <div className="text-center">
                                        <p className="text-[11px] text-vector-white tracking-widest uppercase font-mono">DROP FILE HERE</p>
                                        <p className="text-[9px] text-vector-white/40 font-mono mt-1">or click to browse · PDF, MD, TXT, DOCX</p>
                                    </div>
                                </div>

                                {/* File queue */}
                                {uploadedFiles.length > 0 && (
                                    <div className="border border-vector-blue/30 bg-black/20">
                                        <div className="flex items-center justify-between px-4 py-3 border-b border-vector-blue/20">
                                            <span className="text-[8px] text-vector-blue/60 uppercase tracking-widest font-mono">
                                                QUEUE ({uploadedFiles.length})
                                            </span>
                                        </div>
                                        <div className="divide-y divide-vector-blue/10">
                                            {uploadedFiles.map((f) => (
                                                <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                                                    <span className={`material-symbols-outlined text-[18px] ${
                                                        f.status === "done"      ? "text-green-400" :
                                                        f.status === "error"     ? "text-red-400"   :
                                                        f.status === "uploading" ? "text-vector-blue animate-spin" :
                                                        "text-vector-white/30"}`}>
                                                        {f.status === "done" ? "check_circle" :
                                                         f.status === "error" ? "error" :
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
                                                onClick={handleBuild}
                                                disabled={pendingCount === 0 || phase === "loading"}
                                                className="w-full py-3 bg-vector-blue text-vector-bg text-[9px] uppercase tracking-widest font-bold font-mono hover:brightness-110 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-sm">
                                                    {phase === "loading" ? "hourglass_top" : "auto_awesome"}
                                                </span>
                                                <p>{phase === "loading" ? "ANALYSING..." : `BUILD KNOWLEDGE TREE (${pendingCount} FILE${pendingCount !== 1 ? "S" : ""})`}</p>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Scan log */}
                                {(phase === "loading" || phase === "error") && scanLog.length > 0 && (
                                    <div className="border border-vector-blue/20 bg-black/60">
                                        <div className="px-4 py-2 border-b border-vector-blue/20">
                                            <span className="text-[8px] text-vector-blue/60 font-mono tracking-widest uppercase">AI_PIPELINE_LOG</span>
                                        </div>
                                        <div ref={logRef} className="p-4 max-h-40 overflow-y-auto custom-scrollbar font-mono text-[9px] space-y-1">
                                            {scanLog.map((line, i) => (
                                                <div key={i} className="flex items-center gap-2 text-vector-blue/70">
                                                    <span className="text-vector-blue/30">&gt;</span>
                                                    <span>{line}</span>
                                                </div>
                                            ))}
                                            {phase === "loading" && (
                                                <div className="flex items-center gap-2 text-vector-blue/40">
                                                    <span>&gt;</span>
                                                    <span className="animate-pulse">_</span>
                                                </div>
                                            )}
                                            {phase === "error" && (
                                                <div className="flex items-center gap-2 text-red-400">
                                                    <span>&gt;</span>
                                                    <span>ERROR: {errorMsg}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Error action */}
                                {phase === "error" && (
                                    <button onClick={reset}
                                        className="px-6 py-3 border border-red-500/40 text-red-400 text-[9px] font-mono tracking-widest uppercase hover:bg-red-500/10 transition-all w-fit">
                                        RESET &amp; TRY AGAIN
                                    </button>
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
                                                    <p className="text-[8px] text-vector-white/30 font-mono">.{ext}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="border border-vector-blue/20 bg-black/10 p-5">
                                    <p className="text-[8px] text-vector-blue/50 uppercase tracking-widest font-mono mb-3">PIPELINE_OVERVIEW</p>
                                    {[
                                        { step: "01", label: "TEXT_EXTRACT",  desc: "Read file, strip formatting" },
                                        { step: "02", label: "CHUNK + EMBED", desc: "600-char windows → Pinecone vectors" },
                                        { step: "03", label: "CONCEPT_MAP",   desc: "GPT-4o identifies key concepts" },
                                        { step: "04", label: "TREE_BUILD",    desc: "Nodes + prerequisite edges created" },
                                        { step: "05", label: "GRAPH_RENDER",  desc: "Interactive VectorGraph populated" },
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

                                {/* Live node discovery */}
                                {phase === "loading" && liveNodes.length > 0 && (
                                    <div className="border border-vector-blue/30 bg-black/20 p-4">
                                        <p className="text-[8px] text-vector-blue/50 uppercase tracking-widest font-mono mb-3">
                                            NODES_DISCOVERED ({liveNodes.length})
                                        </p>
                                        <div className="flex flex-col gap-1.5">
                                            {liveNodes.map((n) => (
                                                <div key={n.title} className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                                                    <span className="text-[9px] font-mono text-vector-white/70">{n.title}</span>
                                                </div>
                                            ))}
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-vector-blue text-sm animate-spin">refresh</span>
                                                <span className="text-[9px] font-mono text-vector-blue/50 animate-pulse">scanning...</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── COMPLETE ── */}
                    {phase === "complete" && result && (
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
                                            Subject: <span className="text-vector-blue">{result.subject}</span>
                                            {" · "}AI analysed {(result.text_len / 1000).toFixed(1)}k chars
                                        </p>
                                        <div className="flex gap-6 mt-3">
                                            <div>
                                                <p className="text-[8px] text-vector-white/40 font-mono uppercase tracking-widest">Nodes</p>
                                                <p className="text-2xl font-bold text-green-400 font-mono">{result.nodes.length}</p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] text-vector-white/40 font-mono uppercase tracking-widest">Edges</p>
                                                <p className="text-2xl font-bold text-green-400 font-mono">{result.edges.length}</p>
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
                                    {result.nodes.map((n) => (
                                        <div key={n.title} className="flex items-start gap-2 px-4 py-2.5 border-b border-vector-blue/10">
                                            <span className="material-symbols-outlined text-green-400 text-sm mt-0.5 shrink-0">check_circle</span>
                                            <div>
                                                <p className="text-[9px] font-mono text-vector-white/80">{n.title}</p>
                                                {n.description && (
                                                    <p className="text-[7px] font-mono text-vector-white/30 mt-0.5 leading-relaxed">{n.description}</p>
                                                )}
                                            </div>
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
                                    onClick={reset}
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
