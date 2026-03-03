import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import Header from "../components/Header/Header";
import FocusTunnel from "../components/FocusTunnel/FocusTunnel";
import ZenModeTimer from "./ZenModeTimer";
import MissionCompleteScreen from "./MissionCompleteScreen";
import {
  subscribe,
  getState,
  getMasteryStats,
  getUrgencyQueue,
  getDaysToTest,
} from "../studyStore";
import styles from "./DashboardScreen.module.css";

const statusColor = (mastery) => {
  if (mastery >= 0.7) return "#7DF9FF";
  if (mastery >= 0.3) return "#FFB800";
  return "#FF4444";
};

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function buildForecast(schedule) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return DAYS.map((day, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { day, count: (schedule[key] || []).length };
  });
}

const DashboardScreen = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("dashboard");
  const [activeTask, setActiveTask] = useState(null);
  const [timeSpent, setTimeSpent] = useState(25 * 60);
  const [studyState, setStudyState] = useState(getState());

  useEffect(() => {
    const unsub = subscribe((s) => setStudyState({ ...s }));
    return unsub;
  }, []);

  const stats = getMasteryStats();
  const urgency = getUrgencyQueue(3);
  const forecast = buildForecast(studyState.schedule);

  const hasNodes = studyState.nodes.length > 0;

  const handleStart = (task) => { setActiveTask(task); setPhase("timer"); };
  const handleComplete = (elapsed) => { setTimeSpent(elapsed ?? 25 * 60); setPhase("complete"); };
  const handleGiveUp = () => { setPhase("dashboard"); setActiveTask(null); };
  const handleReEnter = () => setPhase("timer");
  const handleReturnToBase = () => { setPhase("dashboard"); setActiveTask(null); };

  return (
    <div className={styles.container}>
      <div className="scanline" />
      <Sidebar />

      <main className={styles.main}>
        <Header />

        <div className={styles.contentArea}>
          {/* ── Left briefing panel ── */}
          <div className={styles.briefingPanel}>
            {/* Student header */}
            <div className={styles.studentHeader}>
              <p className={styles.briefingLabel}>DAILY_BRIEFING</p>
              <div className={styles.statusRow}>
                <div className={styles.pulseDot} />
                <p className={styles.studentName}>
                  {hasNodes ? studyState.subject || "STUDY SESSION" : "MARTY"}
                </p>
              </div>
              <p className={styles.sessionInfo}>
                {hasNodes
                  ? `${stats.total} nodes tracked`
                  : "No study tree loaded yet"}
              </p>
            </div>

            {!hasNodes ? (
              /* ── Empty state ── */
              <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
                <span className="material-symbols-outlined text-vector-blue/20 text-5xl">
                  account_tree
                </span>
                <p className="text-[10px] text-vector-white/30 font-mono leading-relaxed">
                  Upload a study document in<br />
                  <span className="text-vector-blue/50">Template → Build Tree</span><br />
                  to generate your study plan.
                </p>
                <button
                  onClick={() => navigate("/template")}
                  className="mt-2 px-5 py-2 border border-vector-blue/40 text-vector-blue text-[9px] font-mono tracking-widest uppercase hover:bg-vector-blue/10 transition-all"
                >
                  GO TO TEMPLATE
                </button>
              </div>
            ) : (
              <>
                {/* Mastery overview */}
                <div className={styles.masterySection}>
                  <p className={styles.sectionLabel}>MASTERY_OVERVIEW</p>
                  <div className={styles.masteryList}>
                    {[
                      { label: "MASTERED",    count: stats.mastered,    color: "#7DF9FF" },
                      { label: "IN PROGRESS", count: stats.inProgress,  color: "#FFB800" },
                      { label: "CRITICAL",    count: stats.critical,    color: "#FF4444" },
                    ].map(({ label, count, color }) => (
                      <div key={label}>
                        <div className={styles.masteryLabelRow}>
                          <p className={styles.masteryLabel} style={{ color }}>{label}</p>
                          <p className={styles.masteryCount}>{count}/{stats.total}</p>
                        </div>
                        <div className={styles.barTrack}>
                          <div
                            className={styles.barFill}
                            style={{
                              width: stats.total > 0 ? `${(count / stats.total) * 100}%` : "0%",
                              background: color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Urgency queue */}
                <div className={styles.urgencySection}>
                  <p className={styles.sectionLabel}>URGENCY_QUEUE</p>
                  {urgency.length === 0 ? (
                    <p className="text-[9px] text-vector-white/30 font-mono">All nodes mastered!</p>
                  ) : (
                    <div className={styles.urgencyList}>
                      {urgency.map((node) => {
                        const color = statusColor(node.mastery);
                        return (
                          <button
                            key={node.id}
                            onClick={() => navigate(`/quiz?node=${encodeURIComponent(node.id)}`)}
                            className={`group ${styles.urgencyBtn}`}
                            style={{ borderColor: `${color}30` }}
                            onMouseEnter={(e) => (e.currentTarget.style.borderColor = color)}
                            onMouseLeave={(e) => (e.currentTarget.style.borderColor = `${color}30`)}
                          >
                            <span
                              className={`material-symbols-outlined ${styles.urgencyIcon}`}
                              style={{ color }}
                            >
                              blur_on
                            </span>
                            <div className={styles.nodeInfo}>
                              <p className={styles.nodeLabel}>{node.label}</p>
                              <div className={styles.masteryRow}>
                                <div className={styles.miniBarTrack}>
                                  <div
                                    className={styles.miniBarFill}
                                    style={{ width: `${node.mastery * 100}%`, background: color }}
                                  />
                                </div>
                                <p className={styles.masteryPct} style={{ color }}>
                                  {Math.round(node.mastery * 100)}%
                                </p>
                              </div>
                            </div>
                            {node.testDate && (() => {
                              const days = getDaysToTest(node);
                              const tc = days <= 0 ? "#FF4444" : days <= 3 ? "#FF4444" : days <= 7 ? "#FFB800" : "#7DF9FF";
                              return (
                                <p className={styles.dueBadge} style={{ color: tc, borderColor: `${tc}60`, marginBottom: 2 }}>
                                  TEST {days <= 0 ? "TODAY" : `${days}d`}
                                </p>
                              );
                            })()}
                            <p
                              className={styles.dueBadge}
                              style={{ color, borderColor: `${color}50` }}
                            >
                              {node.mastery === 0 ? "NEW" : node.mastery < 0.3 ? "NOW" : "SOON"}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {urgency.length > 0 && (
                    <button
                      onClick={() => navigate(`/quiz?node=${encodeURIComponent(urgency[0].id)}`)}
                      className={styles.quizMeBtn}
                    >
                      <span className={`material-symbols-outlined ${styles.quizMeIcon}`}>
                        psychology
                      </span>
                      <p>QUIZ ME NOW</p>
                    </button>
                  )}
                </div>

                {/* 7-day forgetting forecast */}
                <div className={styles.forecastSection}>
                  <p className={styles.sectionLabel}>STUDY_FORECAST</p>
                  <div className={styles.forecastChart}>
                    {forecast.map(({ day, count }) => (
                      <div key={day} className={styles.forecastBar}>
                        <div
                          className={styles.forecastBarFill}
                          style={{
                            height: count === 0 ? 4 : `${Math.min(100, (count / 3) * 100)}%`,
                            background:
                              count >= 3 ? "#FF4444" : count >= 2 ? "#FFB800" : count >= 1 ? "#7DF9FF" : "rgba(125,249,255,0.1)",
                            minHeight: 4,
                          }}
                        />
                        <p className={styles.forecastDay}>{day}</p>
                      </div>
                    ))}
                  </div>
                  <p className={styles.forecastNote}>Nodes scheduled per day in study plan</p>
                </div>
              </>
            )}
          </div>

          {/* ── Right: Focus Tunnel ── */}
          <FocusTunnel onStart={handleStart} />
        </div>
      </main>

      {phase === "timer" && (
        <ZenModeTimer
          task={activeTask}
          onComplete={(elapsed) => handleComplete(elapsed)}
          onGiveUp={handleGiveUp}
        />
      )}

      {phase === "complete" && (
        <MissionCompleteScreen
          task={activeTask}
          timeSpentSeconds={timeSpent}
          onReEnter={handleReEnter}
          onReturnToBase={handleReturnToBase}
        />
      )}
    </div>
  );
};

export default DashboardScreen;
