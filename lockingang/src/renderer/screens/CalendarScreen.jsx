import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import styles from "./CalendarScreen.module.css";

// March 2026 — starts on Sunday
const MONTH = "MARCH";
const YEAR = 2026;
const DAYS_IN_MONTH = 31;
const START_DAY = 0; // Sunday

const REVIEW_BLOCKS = {
  2: [{ node: "COMMON_DIST", label: "Common Distributions", status: "critical", time: "11:00pm", duration: "30m", mastery: 0.20 }],
  3: [{ node: "NORMAL_DIST", label: "Normal Distribution", status: "critical", time: "9:00am", duration: "20m", mastery: 0.15 },
  { node: "CENTRAL_LIMIT", label: "Central Limit Theorem", status: "active", time: "3:00pm", duration: "20m", mastery: 0.48 }],
  4: [{ node: "HYPOTHESIS_TEST", label: "Hypothesis Testing", status: "active", time: "10:00am", duration: "20m", mastery: 0.52 }],
  5: [{ node: "BINOMIAL_DIST", label: "Binomial Distribution", status: "active", time: "2:00pm", duration: "20m", mastery: 0.45 }],
  7: [{ node: "COMMON_DIST", label: "Common Distributions", status: "critical", time: "7:00pm", duration: "30m", mastery: 0.35 }],
  9: [{ node: "BAYES_THEOREM", label: "Bayes' Theorem", status: "active", time: "11:00am", duration: "20m", mastery: 0.61 }],
  10: [{ node: "PROBABILITY", label: "Probability", status: "completed", time: "4:00pm", duration: "15m", mastery: 0.92 },
  { node: "COMMON_DIST", label: "Common Distributions", status: "active", time: "8:00pm", duration: "25m", mastery: 0.55 }],
  12: [{ node: "HYPOTHESIS_TEST", label: "Hypothesis Testing", status: "active", time: "9:00am", duration: "20m", mastery: 0.60 }],
  14: [{ node: "CENTRAL_LIMIT", label: "Central Limit Theorem", status: "completed", time: "2:00pm", duration: "15m", mastery: 0.72 }],
  16: [{ node: "NORMAL_DIST", label: "Normal Distribution", status: "active", time: "10:00am", duration: "20m", mastery: 0.55 }],
  18: [{ node: "BINOMIAL_DIST", label: "Binomial Distribution", status: "completed", time: "3:00pm", duration: "15m", mastery: 0.70 }],
  20: [{ node: "BAYES_THEOREM", label: "Bayes' Theorem", status: "completed", time: "11:00am", duration: "15m", mastery: 0.75 }],
  23: [{ node: "COMMON_DIST", label: "Common Distributions", status: "completed", time: "6:00pm", duration: "20m", mastery: 0.80 },
  { node: "HYPOTHESIS_TEST", label: "Hypothesis Testing", status: "completed", time: "8:00pm", duration: "15m", mastery: 0.82 }],
  // CS105 quiz day!
  25: [{ node: "CS105_QUIZ", label: "CS105 STATS QUIZ", status: "exam", time: "9:00am", duration: "2h", mastery: null }],
};

const statusColor = (s) => {
  if (s === "exam") return { border: "#FFD700", text: "#FFD700", bg: "rgba(255,215,0,0.08)" };
  if (s === "critical") return { border: "#FF4444", text: "#FF4444", bg: "rgba(255,68,68,0.08)" };
  if (s === "active") return { border: "#FFB800", text: "#FFB800", bg: "rgba(255,184,0,0.08)" };
  if (s === "completed") return { border: "#7DF9FF", text: "#7DF9FF", bg: "rgba(125,249,255,0.05)" };
  return { border: "rgba(125,249,255,0.3)", text: "rgba(125,249,255,0.7)", bg: "transparent" };
};

const statusIcon = (s) => {
  if (s === "exam") return "school";
  if (s === "critical") return "warning";
  if (s === "active") return "schedule";
  if (s === "completed") return "check_circle";
  return "event";
};

const TODAY = 2; // March 2 for demo

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const CalendarScreen = () => {
  const navigate = useNavigate();
  const [selectedDay, setSelectedDay] = useState(TODAY);

  // Build calendar grid (6 rows × 7 cols)
  const cells = [];
  for (let i = 0; i < START_DAY; i++) cells.push(null);
  for (let d = 1; d <= DAYS_IN_MONTH; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedBlocks = selectedDay ? (REVIEW_BLOCKS[selectedDay] || []) : [];

  const dayHasBlock = (d) => d && REVIEW_BLOCKS[d];
  const dayMaxStatus = (d) => {
    if (!d || !REVIEW_BLOCKS[d]) return null;
    const blocks = REVIEW_BLOCKS[d];
    if (blocks.some(b => b.status === "exam")) return "exam";
    if (blocks.some(b => b.status === "critical")) return "critical";
    if (blocks.some(b => b.status === "active")) return "active";
    return "completed";
  };

  return (
    <div className={styles.container}>
      <div className="scanline" />
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">


        <main className={styles.mainContent}>
          {/* Calendar grid */}
          <div className={styles.calendarArea}>
            {/* Month header */}
            <div className={styles.monthHeader}>
              <h2 className={styles.monthTitle} style={{ textShadow: "0 0 20px rgba(125,249,255,0.3)" }}>
                {MONTH} {YEAR}
              </h2>
              <div className={styles.schedulerInfo}>
                <span className={styles.pulseDot} />
                <span>AUTO-SCHEDULED BY LOCKINGANG · SPACED REPETITION ACTIVE</span>
              </div>
            </div>

            {/* Day headers */}
            <div className={styles.daysGrid}>
              {DAYS.map((d) => (
                <div key={d} className={styles.dayLabel}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className={styles.cellsGrid}>
              {cells.map((day, idx) => {
                if (!day) return <div key={`empty_${idx}`} className={styles.emptyCell} />;
                const blocks = REVIEW_BLOCKS[day] || [];
                const maxStatus = dayMaxStatus(day);
                const sc = maxStatus ? statusColor(maxStatus) : null;
                const isToday = day === TODAY;
                const isSelected = day === selectedDay;

                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={styles.calendarCell}
                    style={{
                      borderColor: isSelected ? "#7DF9FF" : isToday ? "rgba(125,249,255,0.4)" : "rgba(125,249,255,0.08)",
                      background: isSelected ? "rgba(125,249,255,0.05)" : "transparent",
                      boxShadow: isSelected ? "0 0 12px rgba(125,249,255,0.15)" : "none",
                    }}
                  >
                    {/* Day number */}
                    <div className={styles.cellDayNumber}>
                      <span
                        className={styles.dayText}
                        style={{
                          color: isToday ? "#7DF9FF" : "rgba(255,255,255,0.5)",
                          fontWeight: isToday ? "bold" : "normal",
                        }}
                      >
                        {day}
                        {isToday && <span className={styles.todayIndicator}>●</span>}
                      </span>
                    </div>

                    {/* Block dots */}
                    <div className={styles.blockContainer}>
                      {blocks.slice(0, 2).map((b, i) => {
                        const bsc = statusColor(b.status);
                        return (
                          <div
                            key={i}
                            className={styles.blockPill}
                            style={{ background: bsc.bg, color: bsc.text, border: `1px solid ${bsc.border}30` }}
                          >
                            {b.label}
                          </div>
                        );
                      })}
                      {blocks.length > 2 && (
                        <span className={styles.moreBlocks}>+{blocks.length - 2} more</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day detail panel */}
          <div className={styles.detailPanel}>
            <div className={styles.detailHeader}>
              <p className={styles.detailTitle}>
                {selectedDay ? `MARCH ${selectedDay}, ${YEAR}` : "SELECT A DAY"}
              </p>
              {selectedDay === TODAY && (
                <div className={styles.todayStatus}>
                  <div className={styles.todayPulse} />
                  <span className={styles.todayLabel}>TODAY</span>
                </div>
              )}
            </div>

            <div className={styles.detailContent}>
              {selectedBlocks.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={`material-symbols-outlined ${styles.emptyIcon}`}>event_available</span>
                  <p className={styles.emptyText}>No review blocks scheduled</p>
                </div>
              ) : (
                <div className={styles.blockList}>
                  {selectedBlocks.map((block, i) => {
                    const sc = statusColor(block.status);
                    return (
                      <div
                        key={i}
                        className={styles.blockCard}
                        style={{ borderColor: sc.border + "50", background: sc.bg }}
                      >
                        <div className={styles.blockBorder} style={{ background: sc.border }} />
                        <div className={styles.blockHeader}>
                          <div className={styles.blockHeaderInner}>
                            <span className={`material-symbols-outlined ${styles.blockIcon}`} style={{ color: sc.text }}>
                              {statusIcon(block.status)}
                            </span>
                            <span className={styles.blockTitle} style={{ color: sc.text }}>
                              {block.label}
                            </span>
                          </div>
                        </div>
                        <div className={styles.blockMeta}>
                          <span>⏰ {block.time}</span>
                          <span>⏱ {block.duration}</span>
                        </div>
                        {block.mastery !== null && (
                          <div className={styles.masteryContainer}>
                            <div className={styles.masteryLabels}>
                              <span className={styles.masteryLabelText}>MASTERY</span>
                              <span className={styles.masteryValue} style={{ color: sc.text }}>
                                {Math.round(block.mastery * 100)}%
                              </span>
                            </div>
                            <div className={styles.masteryTrack}>
                              <div className={styles.masteryFill} style={{ width: `${block.mastery * 100}%`, background: sc.border }} />
                            </div>
                          </div>
                        )}
                        {block.status === "exam" && (
                          <div className={styles.examMeta}>
                            🎯 CS105 STATS EXAM — MAIN ASSESSMENT
                          </div>
                        )}
                        {block.node !== "CS105_QUIZ" && (
                          <button
                            onClick={() => navigate(`/quiz?node=${block.node}`)}
                            className={styles.quizButton}
                            style={{ borderColor: sc.border + "60", color: sc.text }}
                          >
                            LAUNCH QUIZ
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className={styles.legendPanel}>
              <p className={styles.legendTitle}>DECAY_FORECAST</p>
              <p className={styles.legendText}>
                Review blocks are auto-scheduled based on your forgetting curve.
                Red blocks → decay imminent. Yellow → review soon. Blue → mastered.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default CalendarScreen;
