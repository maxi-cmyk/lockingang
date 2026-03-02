import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./ZenModeTimer.module.css";

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
        <div className={styles.container}>
            <div className="scanline" />

            {/* Grid overlay */}
            <div className={styles.gridOverlay} />

            {/* Top HUD */}
            <div className={styles.topHud}>
                <div className={styles.hudIndicator}>
                    <div className={styles.pulseDot} />
                    <span className={styles.hudLabel}>ZEN_MODE_ENGAGED</span>
                </div>
                <div className={styles.objectiveContainer}>
                    <span className={styles.objectiveLabel}>CURRENT_OBJECTIVE</span>
                    <h1 className={styles.objectiveTitle}>
                        {task?.title ?? "FOCUS_SESSION"}
                    </h1>
                </div>
                <span className={styles.hudRight}>NO_DISTRACTIONS</span>
            </div>

            {/* Timer display */}
            <div className={styles.timerArea}>
                <div className={styles.timerWrapper}>
                    <div className={styles.bracketLeft} />
                    <div className={styles.bracketRight} />
                    <div className={styles.timerText}>
                        {minutes}
                        <span className={styles.timerColon}>:</span>
                        {seconds}
                    </div>
                </div>
                <div className={styles.decorativeLines}>
                    {[0, 1, 2].map((i) => (
                        <div key={i} className={styles.decorativeLine} />
                    ))}
                </div>
            </div>

            {/* Brain dump + toast + buttons */}
            <div className={styles.bottomArea}>

                {/* Brain dump */}
                <div className={styles.dumpBox}>
                    <div className={styles.dumpHeader}>
                        <div className={styles.dumpPrompt}>
                            <span className={styles.promptArrow}>&gt;</span>
                            <span className={styles.promptText}>BRAIN DUMP — press Enter to log thought</span>
                        </div>
                        {queuedDumps.length > 0 && (
                            <span className={styles.loggedCount}>{queuedDumps.length} logged</span>
                        )}
                    </div>
                    <div className={styles.inputRow}>
                        <textarea
                            value={brainDump}
                            onChange={(e) => setBrainDump(e.target.value)}
                            onKeyDown={handleDumpKeyDown}
                            placeholder="Type a stray thought to clear your mind..."
                            className={styles.dumpInput}
                            rows={2}
                        />
                        {brainDump.trim() && (
                            <button
                                onClick={handleDump}
                                className={styles.logBtn}
                            >
                                LOG
                            </button>
                        )}
                    </div>
                    <div className={styles.cursor}>_</div>
                </div>

                {/* Toast notification */}
                {dumpToast && (
                    <div className={styles.toast}>
                        <span className="material-symbols-outlined text-green-400 text-base">check_circle</span>
                        <div>
                            <p className={styles.toastTitle}>THOUGHT LOGGED → NEURAL_LIAISON</p>
                            <p className={styles.toastDesc}>"{dumpToast.text}" will be processed when you finish</p>
                        </div>
                    </div>
                )}

                {/* Buttons */}
                <div className={styles.actionButtons}>
                    <button
                        onClick={onGiveUp}
                        className={styles.giveUpBtn}
                    >
                        <span className="material-symbols-outlined text-lg">logout</span>
                        <span className={styles.btnText}>GIVE UP</span>
                    </button>
                    <button
                        onClick={handleComplete}
                        className={styles.completeBtn}
                    >
                        <span className="material-symbols-outlined text-lg">check_circle</span>
                        <span className={styles.btnTextBold}>
                            {queuedDumps.length > 0 ? "COMPLETE + SEND TO LIAISON" : "COMPLETE"}
                        </span>
                    </button>
                </div>
            </div>

            {/* Bottom HUD */}
            <div className={styles.bottomHud}>
                <span>THOUGHTS_QUEUED: {queuedDumps.length}</span>
                <span>MEM_USAGE: 54% &nbsp;&nbsp; FOCUS_LEVEL: MAX</span>
            </div>
        </div>
    );
};

export default ZenModeTimer;
