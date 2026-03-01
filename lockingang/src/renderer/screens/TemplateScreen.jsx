import React, { useState, useRef } from "react";
import Sidebar from "../components/Sidebar/Sidebar";
import { getNodes } from "../nodeStore";

const ACCEPTED_TYPES = [
    { ext: "md", label: "MARKDOWN", icon: "description", color: "text-vector-blue" },
    { ext: "pdf", label: "PDF", icon: "picture_as_pdf", color: "text-red-400" },
    { ext: "png,jpg,jpeg,webp", label: "IMAGE", icon: "image", color: "text-purple-400" },
    { ext: "txt", label: "PLAINTEXT", icon: "article", color: "text-green-400" },
];

const EXT_TO_TYPE = {
    md: "markdown",
    txt: "plaintext",
    pdf: "pdf",
    png: "image",
    jpg: "image",
    jpeg: "image",
    webp: "image",
};

const TemplateScreen = () => {
    const nodes = getNodes();
    const defaultId = nodes.find((n) => n.isPrimary)?.id ?? nodes[0]?.id ?? "";

    const [selectedNodeId, setSelectedNodeId] = useState(defaultId);
    const [uploadedFiles, setUploadedFiles] = useState([]); // { name, type, status: 'pending'|'uploading'|'done'|'error', message }
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const selectedNode = nodes.find((n) => n.id === selectedNodeId);

    // ── File helpers ────────────────────────────────────────────────────────
    const getFileType = (filename) => {
        const ext = filename.split(".").pop().toLowerCase();
        return EXT_TO_TYPE[ext] ?? null;
    };

    const isAccepted = (filename) => getFileType(filename) !== null;

    const processFiles = (files) => {
        const newEntries = Array.from(files)
            .filter((f) => isAccepted(f.name))
            .map((f) => ({
                id: `${Date.now()}_${f.name}`,
                name: f.name,
                type: getFileType(f.name),
                size: f.size,
                file: f,
                status: "pending",
                message: "",
            }));
        setUploadedFiles((prev) => [...prev, ...newEntries]);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        processFiles(e.dataTransfer.files);
    };

    const handleUploadAll = async () => {
        const pending = uploadedFiles.filter((f) => f.status === "pending");
        if (!pending.length || !selectedNode) return;

        for (const entry of pending) {
            // Mark uploading
            setUploadedFiles((prev) =>
                prev.map((f) => f.id === entry.id ? { ...f, status: "uploading" } : f)
            );

            try {
                // Electron: send the file path + type to Python via IPC
                if (typeof window !== "undefined" && window.api?.uploadNotes) {
                    // Use Electron's file path (accessible via File.path in Electron renderer)
                    const filePath = entry.file.path || entry.name;
                    const result = await window.api.uploadNotes(selectedNodeId, filePath, entry.type);
                    setUploadedFiles((prev) =>
                        prev.map((f) =>
                            f.id === entry.id
                                ? { ...f, status: result?.ok ? "done" : "error", message: result?.error ?? "" }
                                : f
                        )
                    );
                } else {
                    // Dev-mode fallback: simulate success
                    await new Promise((r) => setTimeout(r, 800));
                    setUploadedFiles((prev) =>
                        prev.map((f) =>
                            f.id === entry.id
                                ? { ...f, status: "done", message: "Simulated (IPC not available)" }
                                : f
                        )
                    );
                }
            } catch (err) {
                setUploadedFiles((prev) =>
                    prev.map((f) =>
                        f.id === entry.id ? { ...f, status: "error", message: err.message } : f
                    )
                );
            }
        }
    };

    const removeFile = (id) => setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
    const clearDone = () => setUploadedFiles((prev) => prev.filter((f) => f.status !== "done"));

    const pendingCount = uploadedFiles.filter((f) => f.status === "pending").length;
    const doneCount = uploadedFiles.filter((f) => f.status === "done").length;

    // ── Render ──────────────────────────────────────────────────────────────
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
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[8px] text-vector-white/40 font-mono tracking-widest uppercase">RAG_PIPELINE READY</span>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">

                    {/* Title */}
                    <div>
                        <h1 className="text-2xl font-bold tracking-widest text-vector-white uppercase terminal-text"
                            style={{ textShadow: "0 0 20px rgba(125,249,255,0.4)" }}>
                            UPLOAD_TEMPLATE
                        </h1>
                        <p className="text-[10px] text-vector-blue/60 font-mono tracking-wider mt-1">
                            Attach study materials to a knowledge node. Files are chunked and indexed for RAG retrieval.
                        </p>
                    </div>

                    <div className="grid grid-cols-[1fr_320px] gap-6">

                        {/* Left column */}
                        <div className="flex flex-col gap-5">

                            {/* Node selector */}
                            <div className="border border-vector-blue/30 bg-black/30 p-5">
                                <p className="text-[8px] text-vector-blue/50 uppercase tracking-widest font-mono mb-3">
                                    TARGET_NODE
                                </p>
                                <select
                                    value={selectedNodeId}
                                    onChange={(e) => setSelectedNodeId(e.target.value)}
                                    className="w-full bg-vector-bg border border-vector-blue/30 text-vector-white text-xs font-mono p-3 outline-none focus:border-vector-blue appearance-none cursor-pointer"
                                >
                                    {nodes.length === 0 && (
                                        <option value="">No nodes — add one from the Vector Graph first</option>
                                    )}
                                    {nodes.map((n) => (
                                        <option key={n.id} value={n.id}>
                                            {n.label}{n.isPrimary ? " [PRIMARY]" : ""}
                                        </option>
                                    ))}
                                </select>
                                {selectedNode && (
                                    <p className="text-[9px] text-vector-white/40 font-mono mt-2">
                                        {selectedNode.data || "No description yet."}
                                    </p>
                                )}
                            </div>

                            {/* Drop zone */}
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`relative border-2 border-dashed rounded-none p-12 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all
                  ${isDragging
                                        ? "border-vector-blue bg-vector-blue/10"
                                        : "border-vector-blue/30 hover:border-vector-blue/60 hover:bg-vector-blue/5"}`}
                                style={isDragging ? { boxShadow: "0 0 40px rgba(125,249,255,0.2)" } : {}}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept=".md,.txt,.pdf,.png,.jpg,.jpeg,.webp"
                                    className="hidden"
                                    onChange={(e) => processFiles(e.target.files)}
                                />
                                <span
                                    className="material-symbols-outlined text-[48px] transition-colors"
                                    style={{ color: isDragging ? "#7DF9FF" : "rgba(125,249,255,0.3)" }}
                                >
                                    cloud_upload
                                </span>
                                <div className="text-center">
                                    <p className="text-[11px] text-vector-white tracking-widest uppercase font-mono">
                                        DROP FILES HERE
                                    </p>
                                    <p className="text-[9px] text-vector-white/40 font-mono mt-1">
                                        or click to browse
                                    </p>
                                </div>
                                {isDragging && (
                                    <div className="absolute inset-0 border-2 border-vector-blue animate-ping opacity-20 pointer-events-none" />
                                )}
                            </div>

                            {/* File queue */}
                            {uploadedFiles.length > 0 && (
                                <div className="border border-vector-blue/30 bg-black/20">
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-vector-blue/20">
                                        <span className="text-[8px] text-vector-blue/60 uppercase tracking-widest font-mono">
                                            QUEUE ({uploadedFiles.length}) — {doneCount} INDEXED
                                        </span>
                                        {doneCount > 0 && (
                                            <button
                                                onClick={clearDone}
                                                className="text-[8px] text-vector-white/30 hover:text-vector-blue font-mono uppercase tracking-widest transition-colors"
                                            >
                                                CLEAR DONE
                                            </button>
                                        )}
                                    </div>
                                    <div className="divide-y divide-vector-blue/10">
                                        {uploadedFiles.map((f) => (
                                            <div key={f.id} className="flex items-center gap-3 px-4 py-3">
                                                <span className={`material-symbols-outlined text-[18px] ${f.status === "done" ? "text-green-400" :
                                                        f.status === "error" ? "text-red-400" :
                                                            f.status === "uploading" ? "text-vector-blue animate-spin" :
                                                                "text-vector-white/30"
                                                    }`}>
                                                    {f.status === "done" ? "check_circle" :
                                                        f.status === "error" ? "error" :
                                                            f.status === "uploading" ? "refresh" :
                                                                "schedule"}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] text-vector-white font-mono truncate">{f.name}</p>
                                                    {f.message && (
                                                        <p className="text-[8px] text-vector-white/40 font-mono mt-0.5">{f.message}</p>
                                                    )}
                                                </div>
                                                <span className="text-[8px] text-vector-white/30 font-mono uppercase shrink-0">
                                                    {f.type}
                                                </span>
                                                <button
                                                    onClick={() => removeFile(f.id)}
                                                    className="text-vector-white/20 hover:text-red-400 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Upload button */}
                                    <div className="px-4 py-3 border-t border-vector-blue/20">
                                        <button
                                            onClick={handleUploadAll}
                                            disabled={pendingCount === 0}
                                            className="w-full py-3 bg-vector-blue text-vector-bg text-[9px] uppercase tracking-widest font-bold font-mono hover:brightness-110 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-sm">upload_file</span>
                                            CHUNK &amp; INDEX {pendingCount > 0 ? `(${pendingCount} FILE${pendingCount > 1 ? "S" : ""})` : ""}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right column — accepted types + info */}
                        <div className="flex flex-col gap-4">
                            <div className="border border-vector-blue/30 bg-black/20 p-5">
                                <p className="text-[8px] text-vector-blue/50 uppercase tracking-widest font-mono mb-4">
                                    ACCEPTED_FORMATS
                                </p>
                                <div className="flex flex-col gap-3">
                                    {ACCEPTED_TYPES.map(({ ext, label, icon, color }) => (
                                        <div key={label} className="flex items-center gap-3 p-3 border border-vector-blue/15 bg-vector-blue/3">
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
                                <p className="text-[8px] text-vector-blue/50 uppercase tracking-widest font-mono mb-3">
                                    PIPELINE_OVERVIEW
                                </p>
                                {[
                                    { step: "01", label: "TEXT_EXTRACT", desc: "Read file content (PDF/OCR for images)" },
                                    { step: "02", label: "CHUNK", desc: "400-word windows, 50-word overlap" },
                                    { step: "03", label: "EMBED", desc: "768-float vectors via Transformers.js" },
                                    { step: "04", label: "FAISS_INDEX", desc: "Per-node IndexFlatIP for RAG queries" },
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
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default TemplateScreen;
