import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const INITIAL_SECONDS = 25 * 60;

const ZenModeTimer = ({ task, onComplete, onGiveUp }) => {
    const navigate = useNavigate();
    const [secondsLeft, setSecondsLeft] = useState(INITIAL_SECONDS);
    const [brainDump, setBrainDump] = useState("");
    const [dumpToast, setDumpToast] = useState(null); // { text }
    const [queuedDumps, setQueuedDumps] = useState([]);
    const intervalRef = useRef(null);

    useEffect(() => {
        intervalRef.current = setInterval(() => {
            setSecondsLeft((s) => {
                if (s <= 1) {
                    clearInterval(intervalRef.current);
                    onComplete(INITIAL_SECONDS);
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
        return () => clearInterval(intervalRef.current);
    }, [onComplete]);

    const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
    const seconds = String(secondsLeft % 60).padStart(2, "0");

    const handleDump = () => {
        const text = brainDump.trim();
        if (!text) return;
        setQueuedDumps((prev) => [...prev, text]);
        setBrainDump("");
        setDumpToast({ text });
        setTimeout(() => setDumpToast(null), 2500);
    };

    const handleDumpKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleDump();
        }
    };

    const handleComplete = () => {
        const elapsed = INITIAL_SECONDS - secondsLeft;
        if (queuedDumps.length > 0) {
            // Pass the latest brain dump to chatbot via navigation state
            navigate("/chatbot", { state: { brainDump: queuedDumps[queuedDumps.length - 1] } });
        } else {
            onComplete(elapsed);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-vector-bg flex flex-col overflow-hidden">
            <div className="scanline" />

            {/* Grid overlay */}
            <div
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                    backgroundImage:
                        "linear-gradient(to right, rgba(125,249,255,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(125,249,255,0.15) 1px, transparent 1px)",
                    backgroundSize: "60px 60px",
                }}
            />

            {/* Top HUD */}
            <div className="relative z-10 flex justify-between items-start px-8 pt-6">
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 bg-vector-blue animate-pulse" />
                    <span className="text-[10px] text-vector-blue tracking-widest uppercase font-mono">ZEN_MODE_ENGAGED</span>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-vector-blue/60 tracking-widest uppercase font-mono">CURRENT_OBJECTIVE</span>
                    <h1 className="text-sm text-vector-white tracking-[0.2em] uppercase font-bold terminal-text border-b border-vector-blue/40 pb-1">
                        {task?.title ?? "FOCUS_SESSION"}
                    </h1>
                </div>
                <span className="text-[10px] text-vector-white/30 tracking-widest uppercase font-mono">NO_DISTRACTIONS</span>
            </div>

            {/* Timer display */}
            <div className="flex-1 flex flex-col items-center justify-center gap-8">
                <div className="relative flex items-center justify-center">
                    <div className="absolute -left-8 top-1/2 -translate-y-1/2 h-24 w-6 border-l-2 border-t-2 border-b-2 border-vector-blue/40" />
                    <div className="absolute -right-8 top-1/2 -translate-y-1/2 h-24 w-6 border-r-2 border-t-2 border-b-2 border-vector-blue/40" />
                    <div
                        className="text-[10rem] font-mono leading-none tracking-widest terminal-text text-vector-white"
                        style={{
                            fontVariantNumeric: "tabular-nums",
                            textShadow: "0 0 40px rgba(125,249,255,0.6), 0 0 80px rgba(125,249,255,0.2)",
                        }}
                    >
                        {minutes}
                        <span className="text-vector-blue/60 animate-pulse mx-2">:</span>
                        {seconds}
                    </div>
                </div>
                <div className="flex gap-6">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="h-0.5 w-12 bg-vector-blue/60" />
                    ))}
                </div>
            </div>

            {/* Brain dump + toast + buttons */}
            <div className="relative z-10 flex flex-col items-center gap-4 px-8 pb-10">

                {/* Brain dump */}
                <div className="w-full max-w-2xl border border-vector-blue/30 bg-vector-bg/60 p-4 font-mono">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-vector-blue text-xs">&gt;</span>
                            <span className="text-[10px] text-vector-blue/50 tracking-widest uppercase">BRAIN DUMP — press Enter to log thought</span>
                        </div>
                        {queuedDumps.length > 0 && (
                            <span className="text-[10px] text-green-400 font-mono">{queuedDumps.length} logged</span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <textarea
                            value={brainDump}
                            onChange={(e) => setBrainDump(e.target.value)}
                            onKeyDown={handleDumpKeyDown}
                            placeholder="Type a stray thought to clear your mind..."
                            className="flex-1 bg-transparent text-vector-white/70 placeholder:text-vector-white/20 text-xs font-mono resize-none outline-none"
                            rows={2}
                        />
                        {brainDump.trim() && (
                            <button
                                onClick={handleDump}
                                className="self-end px-3 py-1 border border-vector-blue/50 text-vector-blue text-[10px] font-mono tracking-widest uppercase hover:bg-vector-blue/10 transition-all"
                            >
                                LOG
                            </button>
                        )}
                    </div>
                    <div className="text-vector-blue/40 text-xs mt-1">_</div>
                </div>

                {/* Toast notification */}
                {dumpToast && (
                    <div
                        className="fixed bottom-32 left-1/2 -translate-x-1/2 border border-green-500/70 bg-black/90 px-6 py-3 flex items-center gap-3 z-50"
                        style={{ boxShadow: "0 0 20px rgba(74,222,128,0.3)", animation: "fadeIn 0.2s ease" }}
                    >
                        <span className="material-symbols-outlined text-green-400 text-base">check_circle</span>
                        <div>
                            <p className="text-[11px] text-green-400 font-mono tracking-widest uppercase">THOUGHT LOGGED → NEURAL_LIAISON</p>
                            <p className="text-[10px] text-vector-white/50 font-mono mt-0.5">"{dumpToast.text}" will be processed when you finish</p>
                        </div>
                    </div>
                )}

                {/* Buttons */}
                <div className="flex gap-6">
                    <button
                        onClick={onGiveUp}
                        className="flex flex-col items-center gap-1 px-10 py-3 border border-vector-white/20 bg-vector-bg text-vector-white/50 hover:border-vector-white/50 hover:text-vector-white transition-all"
                    >
                        <span className="material-symbols-outlined text-lg">logout</span>
                        <span className="text-[11px] tracking-widest uppercase font-mono">GIVE UP</span>
                    </button>
                    <button
                        onClick={handleComplete}
                        className="flex flex-col items-center gap-1 px-10 py-3 border-2 border-vector-blue bg-vector-blue/10 text-vector-blue hover:bg-vector-blue/20 transition-all shadow-[0_0_20px_rgba(125,249,255,0.3)]"
                    >
                        <span className="material-symbols-outlined text-lg">check_circle</span>
                        <span className="text-[11px] tracking-widest uppercase font-bold font-mono">
                            {queuedDumps.length > 0 ? "COMPLETE + SEND TO LIAISON" : "COMPLETE"}
                        </span>
                    </button>
                </div>
            </div>

            {/* Bottom HUD */}
            <div className="relative z-10 flex justify-between items-center px-8 pb-4 text-[10px] text-vector-white/20 font-mono tracking-widest">
                <span>THOUGHTS_QUEUED: {queuedDumps.length}</span>
                <span>MEM_USAGE: 54% &nbsp;&nbsp; FOCUS_LEVEL: MAX</span>
            </div>
        </div>
    );
};

export default ZenModeTimer;
