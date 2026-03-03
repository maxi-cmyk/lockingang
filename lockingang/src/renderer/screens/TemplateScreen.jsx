import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import { getNodes } from "../nodeStore";
import styles from "./TemplateScreen.module.css";

const ACCEPTED_TYPES = [
    { ext: "md", label: "MARKDOWN", icon: "description", color: "text-vector-blue" },
    { ext: "pdf", label: "PDF", icon: "picture_as_pdf", color: "text-red-400" },
    { ext: "png,jpg,jpeg,webp", label: "IMAGE", icon: "image", color: "text-purple-400" },
    { ext: "txt", label: "PLAINTEXT", icon: "article", color: "text-green-400" },
];

const EXT_TO_TYPE = { md: "markdown", txt: "plaintext", pdf: "pdf", png: "image", jpg: "image", jpeg: "image", webp: "image" };

const DEMO_FILES = [
    { id: "df1", name: "CS105_lecture_week1.pdf", type: "pdf", size: 2400000 },
    { id: "df2", name: "CS105_lecture_week2.pdf", type: "pdf", size: 1900000 },
    { id: "df3", name: "marty_notes_handwritten.png", type: "image", size: 870000 },
    { id: "df4", name: "stats_past_paper_2024.pdf", type: "pdf", size: 3100000 },
    { id: "df5", name: "probability_cheatsheet.md", type: "markdown", size: 45000 },
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
    const [isPipelineOpen, setIsPipelineOpen] = useState(false);
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
        <div className={styles.container}>
            <div className={styles.scanline} />
            <Sidebar />

            <div className={styles.contentWrapper}>
                <main className={`${styles.mainScrollArea} custom-scrollbar`}>
                    <div>
                        <h1 className={styles.headerTitle}>
                            UPLOAD_TEMPLATE
                        </h1>
                        <p className={styles.headerDesc}>
                            Drop your study materials. The AI reads everything and builds your knowledge tree automatically.
                        </p>
                    </div>

                    {/* Demo quick-load banner */}
                    {demoPhase === "idle" && uploadedFiles.length === 0 && (
                        <div className={styles.demoBanner}>
                            <div>
                                <p className={styles.demoBannerTitle}>DEMO: CS105 Course Materials</p>
                                <p className={styles.demoBannerDesc}>Load Marty's lecture PDFs, handwritten notes and past papers</p>
                            </div>
                            <button
                                onClick={loadDemoFiles}
                                className={styles.demoLoadBtn}
                            >
                                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                                <p>LOAD FILES</p>
                            </button>
                        </div>
                    )}

                    {/* Main grid - hide when analysis complete */}
                    {demoPhase !== "complete" && (
                        <div className={styles.mainGrid}>
                            <div className={styles.leftCol}>

                                {/* Drop zone */}
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={() => setIsDragging(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`${styles.dropZoneBase} ${isDragging ? styles.dropZoneActive : styles.dropZoneInactive}`}
                                >
                                    <input ref={fileInputRef} type="file" multiple accept=".md,.txt,.pdf,.png,.jpg,.jpeg,.webp"
                                        className="hidden" onChange={(e) => processFiles(e.target.files)} />
                                    <span className={`${styles.dropZoneIconBase} material-symbols-outlined text-[48px]`}
                                        style={{ color: isDragging ? "#7DF9FF" : "rgba(125,249,255,0.3)" }}>cloud_upload</span>
                                    <div className="text-center">
                                        <p className={styles.dropZoneTitle}>DROP FILES HERE</p>
                                        <p className={styles.dropZoneDesc}>or click to browse · PDF, MD, IMG, TXT</p>
                                    </div>
                                    {isDragging && <div className={styles.dropZonePing} />}
                                </div>

                                {/* File queue */}
                                <div className={styles.queueCard}>
                                    <div className={styles.queueHeader}>
                                        <span className={styles.queueTitle}>
                                            QUEUE ({uploadedFiles.length}) — {doneCount} INDEXED
                                        </span>
                                        {doneCount > 0 && (
                                            <button onClick={clearDone} className={styles.queueClearBtn}>
                                                <p>CLEAR DONE</p>
                                            </button>
                                        )}
                                    </div>
                                    <div className={styles.queueList}>
                                        {uploadedFiles.length === 0 ? (
                                            <div className={styles.queueEmptyState}>
                                                <span className={`material-symbols-outlined ${styles.queueEmptyIcon}`}>topic</span>
                                                <p className={styles.queueEmptyText}>NO FILES UPLOADED YET</p>
                                            </div>
                                        ) : (
                                            uploadedFiles.map((f) => (
                                                <div key={f.id} className={styles.queueItem}>
                                                    <span className={`material-symbols-outlined text-[18px] ${f.status === "done" ? "text-green-400" :
                                                        f.status === "error" ? "text-red-400" :
                                                            f.status === "uploading" ? "text-vector-blue animate-spin" :
                                                                "text-vector-white/30"}`}>
                                                        {f.status === "done" ? "check_circle" : f.status === "error" ? "error" :
                                                            f.status === "uploading" ? "refresh" : "schedule"}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={styles.queueItemName}>{f.name}</p>
                                                        {f.message && <p className={styles.queueItemMsg}>{f.message}</p>}
                                                    </div>
                                                    <span className={styles.queueItemSize}>{fmtSize(f.size)}</span>
                                                    {f.status === "pending" && (
                                                        <button onClick={() => removeFile(f.id)} className={styles.queueItemRemove}>
                                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                                        </button>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className={styles.queueFooter}>
                                        <button
                                            onClick={handleUploadAll}
                                            disabled={pendingCount === 0 || demoPhase === "loading"}
                                            className={styles.queueBuildBtn}
                                        >
                                            <span className="material-symbols-outlined text-sm">
                                                {demoPhase === "loading" ? "hourglass_top" : "auto_awesome"}
                                            </span>
                                            <p>{demoPhase === "loading" ? "ANALYSING..." : `BUILD KNOWLEDGE TREE (${pendingCount} FILE${pendingCount !== 1 ? "S" : ""})`}</p>
                                        </button>
                                    </div>
                                </div>

                                {/* Scan log */}
                                {demoPhase === "loading" && scanLog.length > 0 && (
                                    <div className={styles.logCard}>
                                        <div className={styles.logHeader}>
                                            <span className={styles.logTitle}>AI_PIPELINE_LOG</span>
                                        </div>
                                        <div ref={logRef} className={`${styles.logScrollArea} custom-scrollbar`}>
                                            {scanLog.map((line, i) => (
                                                <div key={i} className={styles.logLine}>
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
                            <div className={styles.rightCol}>
                                <div className={styles.formatsCard}>
                                    <p className={styles.cardTitle}>ACCEPTED_FORMATS</p>
                                    <div className={styles.formatsList}>
                                        {ACCEPTED_TYPES.map(({ ext, label, icon, color }) => (
                                            <div key={label} className={styles.formatItem}>
                                                <span className={`material-symbols-outlined text-[20px] ${color}`}>{icon}</span>
                                                <div>
                                                    <p className={`${styles.formatLabel} ${color}`}>{label}</p>
                                                    <p className={styles.formatExt}>.{ext}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Live node discovery panel */}
                                {demoPhase === "loading" && discoveredNodes.length > 0 && (
                                    <div className={styles.formatsCard}>
                                        <p className={styles.cardTitleMb3}>
                                            NODES_DISCOVERED ({discoveredNodes.length}/{DEMO_NODES.length})
                                        </p>
                                        <div className={styles.discoveryList}>
                                            {discoveredNodes.map((n) => (
                                                <div key={n} className={styles.discoveryItem}>
                                                    <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                                                    <span className={styles.discoveryNode}>{n}</span>
                                                </div>
                                            ))}
                                            {nodeIdx < DEMO_NODES.length && (
                                                <div className={styles.discoveryItem}>
                                                    <span className="material-symbols-outlined text-vector-blue text-sm animate-spin">refresh</span>
                                                    <span className={styles.scanningText}>scanning...</span>
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
                        <div className={styles.completeView}>
                            {/* Success banner */}
                            <div className={styles.successBanner}>
                                <div className={styles.successBannerLine} />
                                <div className={styles.successBannerContent}>
                                    <span className="material-symbols-outlined text-green-400 text-4xl">check_circle</span>
                                    <div>
                                        <h2 className={styles.successTitle}>
                                            KNOWLEDGE TREE GENERATED
                                        </h2>
                                        <p className={styles.successDesc}>
                                            AI analysed 5 files · identified 11 core concepts · built 11 prerequisite edges
                                        </p>
                                        <div className={styles.successStats}>
                                            <div>
                                                <p className={styles.statLabel}>Nodes Created</p>
                                                <p className={styles.statNumber}>11</p>
                                            </div>
                                            <div>
                                                <p className={styles.statLabel}>Edges Mapped</p>
                                                <p className={styles.statNumber}>11</p>
                                            </div>
                                            <div>
                                                <p className={styles.statLabel}>Chunks Indexed</p>
                                                <p className={styles.statNumber}>247</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Node list */}
                            <div className={styles.nodeListCard}>
                                <div className={styles.nodeListHeader}>
                                    <span className="text-[8px] text-vector-blue/60 font-mono tracking-widest uppercase">GENERATED_NODES</span>
                                </div>
                                <div className={styles.nodeListGrid}>
                                    {DEMO_NODES.map((n) => (
                                        <div key={n} className={styles.nodeListItem}>
                                            <span className="material-symbols-outlined text-green-400 text-sm">check_circle</span>
                                            <span className="text-[9px] font-mono text-vector-white/70">{n}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.completeActionArea}>
                                <button
                                    onClick={() => navigate("/knowledge-tree")}
                                    className={styles.viewTreeBtn}
                                >
                                    <span className="material-symbols-outlined">account_tree</span>
                                    <p>VIEW KNOWLEDGE TREE</p>
                                </button>
                                <button
                                    onClick={() => { setDemoPhase("idle"); setUploadedFiles([]); setScanLog([]); setDiscoveredNodes([]); }}
                                    className={styles.resetBtn}
                                >
                                    <p>RESET</p>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Floating Pipeline Overview */}
                    {isPipelineOpen && (
                        <div className={styles.pipelinePanel}>
                            <p className={styles.pipelineTitle}>PIPELINE_OVERVIEW</p>
                            {[
                                { step: "01", label: "TEXT_EXTRACT", desc: "Read file content (PDF/OCR for images)" },
                                { step: "02", label: "CHUNK", desc: "400-word windows, 50-word overlap" },
                                { step: "03", label: "EMBED", desc: "768-float vectors via Transformers.js" },
                                { step: "04", label: "CONCEPT_MAP", desc: "Cluster semantics → identify nodes" },
                                { step: "05", label: "FAISS_INDEX", desc: "Per-node IndexFlatIP for RAG queries" },
                            ].map(({ step, label, desc }) => (
                                <div key={step} className={styles.pipelineItem}>
                                    <span className={styles.pipelineStepNum}>{step}</span>
                                    <div>
                                        <p className={styles.pipelineStepLabel}>{label}</p>
                                        <p className={styles.pipelineStepDesc}>{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pipeline Toggle Button */}
                    <button
                        className={styles.pipelineToggleButton}
                        onClick={() => setIsPipelineOpen(!isPipelineOpen)}
                        title="Toggle Pipeline Overview"
                    >
                        <span className="material-symbols-outlined text-[20px]">
                            {isPipelineOpen ? 'close' : 'help'}
                        </span>
                    </button>
                </main>
            </div>
        </div>
    );
};

export default TemplateScreen;
