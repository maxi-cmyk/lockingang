import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";

import FocusTunnel from "../components/FocusTunnel/FocusTunnel";
import ZenModeTimer from "./ZenModeTimer";
import MissionCompleteScreen from "./MissionCompleteScreen";
import styles from "./DashboardScreen.module.css";

const URGENCY = [
  {
    id: "COMMON_DIST",
    label: "Common Distributions",
    mastery: 0.2,
    status: "critical",
    dueIn: "NOW",
    icon: "bar_chart",
  },
  {
    id: "NORMAL_DIST",
    label: "Normal Distribution",
    mastery: 0.15,
    status: "critical",
    dueIn: "5h",
    icon: "area_chart",
  },
  {
    id: "CENTRAL_LIMIT",
    label: "Central Limit Thm",
    mastery: 0.48,
    status: "active",
    dueIn: "2d",
    icon: "trending_up",
  },
];

const FORECAST = [
  { day: "MON", count: 0 },
  { day: "TUE", count: 2 },
  { day: "WED", count: 1 },
  { day: "THU", count: 3 },
  { day: "FRI", count: 1 },
  { day: "SAT", count: 0 },
  { day: "SUN", count: 4 },
];

const statusColor = (s) => {
  if (s === "critical") return "#FF4444";
  if (s === "active") return "#FFB800";
  return "#7DF9FF";
};

const DashboardScreen = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState("dashboard");
  const [activeTask, setActiveTask] = useState(null);
  const [timeSpent, setTimeSpent] = useState(25 * 60);

  const handleStart = (task) => {
    setActiveTask(task);
    setPhase("timer");
  };
  const handleComplete = (elapsed) => {
    setTimeSpent(elapsed ?? 25 * 60);
    setPhase("complete");
  };
  const handleGiveUp = () => {
    setPhase("dashboard");
    setActiveTask(null);
  };
  const handleReEnter = () => setPhase("timer");
  const handleReturnToBase = () => {
    setPhase("dashboard");
    setActiveTask(null);
  };

  return (
    <div className={styles.container}>
      <div className="scanline" />
      <Sidebar />

      <main className={styles.main}>

        <div className={styles.contentArea}>
          {/* ── Left briefing panel ── */}
          <div className={styles.briefingPanel}>
            {/* Student header */}
            <div className={styles.studentHeader}>
              <p className={styles.briefingLabel}>DAILY_BRIEFING</p>
              <div className={styles.statusRow}>
                <div className={styles.pulseDot} />
                <p className={styles.studentName}>MARTY — CS105 STATS</p>
              </div>
              <p className={styles.sessionInfo}>
                11 nodes tracked · Session #14
              </p>
            </div>

            {/* Mastery overview */}
            <div className={styles.masterySection}>
              <p className={styles.sectionLabel}>MASTERY_OVERVIEW</p>
              <div className={styles.masteryList}>
                {[
                  { label: "MASTERED", count: 5, total: 11, color: "#7DF9FF" },
                  {
                    label: "IN PROGRESS",
                    count: 4,
                    total: 11,
                    color: "#FFB800",
                  },
                  { label: "CRITICAL", count: 2, total: 11, color: "#FF4444" },
                ].map(({ label, count, total, color }) => (
                  <div key={label}>
                    <div className={styles.masteryLabelRow}>
                      <p className={styles.masteryLabel} style={{ color }}>
                        {label}
                      </p>
                      <p className={styles.masteryCount}>
                        {count}/{total}
                      </p>
                    </div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{
                          width: `${(count / total) * 100}%`,
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
              <div className={styles.urgencyList}>
                {URGENCY.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => navigate(`/quiz?node=${node.id}`)}
                    className={`group ${styles.urgencyBtn}`}
                    style={{ borderColor: `${statusColor(node.status)}30` }}
                    onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = statusColor(
                      node.status,
                    ))
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = `${statusColor(node.status)}30`)
                    }
                  >
                    <span
                      className={`material-symbols-outlined ${styles.urgencyIcon}`}
                      style={{ color: statusColor(node.status) }}
                    >
                      {node.icon}
                    </span>
                    <div className={styles.nodeInfo}>
                      <p className={styles.nodeLabel}>{node.label}</p>
                      <div className={styles.masteryRow}>
                        <div className={styles.miniBarTrack}>
                          <div
                            className={styles.miniBarFill}
                            style={{
                              width: `${node.mastery * 100}%`,
                              background: statusColor(node.status),
                            }}
                          />
                        </div>
                        <p
                          className={styles.masteryPct}
                          style={{ color: statusColor(node.status) }}
                        >
                          {Math.round(node.mastery * 100)}%
                        </p>
                      </div>
                    </div>
                    <p
                      className={styles.dueBadge}
                      style={{
                        color: statusColor(node.status),
                        borderColor: `${statusColor(node.status)}50`,
                      }}
                    >
                      {node.dueIn}
                    </p>
                  </button>
                ))}
              </div>
              <button
                onClick={() => navigate("/quiz?node=COMMON_DIST")}
                className={styles.quizMeBtn}
              >
                <span
                  className={`material-symbols-outlined ${styles.quizMeIcon}`}
                >
                  psychology
                </span>
                <p>QUIZ ME NOW</p>
              </button>
            </div>

            {/* 7-day forgetting forecast */}
            <div className={styles.forecastSection}>
              <p className={styles.sectionLabel}>FORGETTING_FORECAST</p>
              <div className={styles.forecastChart}>
                {FORECAST.map(({ day, count }) => (
                  <div key={day} className={styles.forecastBar}>
                    <div
                      className={styles.forecastBarFill}
                      style={{
                        height: count === 0 ? 4 : `${(count / 4) * 100}%`,
                        background:
                          count >= 3
                            ? "#FF4444"
                            : count >= 2
                              ? "#FFB800"
                              : count >= 1
                                ? "#7DF9FF"
                                : "rgba(125,249,255,0.1)",
                        minHeight: 4,
                      }}
                    />
                    <p className={styles.forecastDay}>{day}</p>
                  </div>
                ))}
              </div>
              <p className={styles.forecastNote}>
                Nodes predicted to decay below threshold
              </p>
            </div>
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
