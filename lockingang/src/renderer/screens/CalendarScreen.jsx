import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import { subscribe, getState, getNodeById } from "../studyStore";

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function masteryToStatus(mastery) {
  if (mastery === 0) return "new";
  if (mastery >= 0.7) return "completed";
  if (mastery >= 0.3) return "active";
  return "critical";
}

const statusColor = (s) => {
  if (s === "rescheduled") return { border: "#FF4444", text: "#FF4444", bg: "rgba(255,68,68,0.08)" };
  if (s === "critical")    return { border: "#FF4444", text: "#FF4444", bg: "rgba(255,68,68,0.08)" };
  if (s === "active")      return { border: "#FFB800", text: "#FFB800", bg: "rgba(255,184,0,0.08)" };
  if (s === "completed")   return { border: "#7DF9FF", text: "#7DF9FF", bg: "rgba(125,249,255,0.05)" };
  return { border: "rgba(125,249,255,0.3)", text: "rgba(125,249,255,0.7)", bg: "transparent" };
};

const statusIcon = (s) => {
  if (s === "rescheduled") return "replay";
  if (s === "critical")    return "warning";
  if (s === "active")      return "schedule";
  if (s === "completed")   return "check_circle";
  return "event";
};

const CalendarScreen = () => {
  const navigate = useNavigate();
  const [studyState, setStudyState] = useState(getState());

  useEffect(() => {
    const unsub = subscribe((s) => setStudyState({ ...s }));
    return unsub;
  }, []);

  const today = new Date();
  const todayKey = getTodayKey();
  const month = today.getMonth();
  const year = today.getFullYear();
  const MONTH_NAMES = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
  const DAYS_IN_MONTH = new Date(year, month + 1, 0).getDate();
  const START_DAY = new Date(year, month, 1).getDay(); // 0=Sun

  const [selectedDay, setSelectedDay] = useState(today.getDate());

  // Build calendar cells
  const cells = [];
  for (let i = 0; i < START_DAY; i++) cells.push(null);
  for (let d = 1; d <= DAYS_IN_MONTH; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // Build a day-keyed view of the schedule for this month
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const reviewBlocks = {}; // day → [{nodeId, nodeLabel, nodeStatus, blockStatus}]

  Object.entries(studyState.schedule).forEach(([dateStr, blocks]) => {
    if (!dateStr.startsWith(monthStr)) return;
    const day = parseInt(dateStr.slice(8, 10), 10);
    reviewBlocks[day] = blocks.map((b) => {
      const node = studyState.nodes.find((n) => n.id === b.nodeId);
      const nodeStatus = node ? masteryToStatus(node.mastery) : "new";
      return {
        nodeId: b.nodeId,
        label: b.nodeLabel || b.nodeId,
        status: b.status === "rescheduled" ? "rescheduled" : nodeStatus,
        mastery: node?.mastery ?? 0,
        description: node?.description || "",
      };
    });
  });

  const selectedKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
  const selectedBlocks = reviewBlocks[selectedDay] || [];
  const todayDate = today.getDate();

  const dayMaxStatus = (d) => {
    const blocks = reviewBlocks[d];
    if (!blocks || blocks.length === 0) return null;
    if (blocks.some((b) => b.status === "rescheduled")) return "rescheduled";
    if (blocks.some((b) => b.status === "critical")) return "critical";
    if (blocks.some((b) => b.status === "active" || b.status === "new")) return "active";
    return "completed";
  };

  const hasData = Object.keys(reviewBlocks).length > 0;

  return (
    <div className="h-screen flex overflow-hidden bg-vector-bg text-vector-white font-terminal relative">
      <div className="scanline" />
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-vector-blue flex items-center justify-between px-6 backdrop-blur-md bg-vector-bg/40 z-10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-vector-white/60 font-mono tracking-wider">SYSTEM</span>
            <span className="text-[12px] text-vector-blue font-bold">&gt;&gt;</span>
            <span className="text-[12px] text-vector-blue font-mono tracking-wider terminal-text">
              CALENDAR_SCHEDULE — {MONTH_NAMES[month]} {year}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono">
            {[
              { label: "RESCHEDULED", color: "#FF4444" },
              { label: "REVIEW",      color: "#FFB800" },
              { label: "MASTERED",    color: "#7DF9FF" },
              { label: "NEW",         color: "rgba(125,249,255,0.4)" },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="h-2 w-2" style={{ background: color }} />
                <span style={{ color }} className="tracking-widest">{label}</span>
              </div>
            ))}
          </div>
        </header>

        {!hasData ? (
          /* ── Empty state ── */
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <span className="material-symbols-outlined text-vector-blue/20 text-6xl">calendar_month</span>
            <p className="text-[13px] text-vector-white/30 font-mono leading-relaxed">
              No study plan yet.<br />
              Upload a document in <span className="text-vector-blue/50">Template</span> to auto-schedule nodes.
            </p>
            <button
              onClick={() => navigate("/template")}
              className="mt-2 px-6 py-2 border border-vector-blue/40 text-vector-blue text-[11px] font-mono tracking-widest uppercase hover:bg-vector-blue/10 transition-all"
            >
              BUILD STUDY TREE
            </button>
          </div>
        ) : (
          <main className="flex-1 flex overflow-hidden">
            {/* Calendar grid */}
            <div className="flex-1 flex flex-col p-6 min-w-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold tracking-widest terminal-text"
                  style={{ textShadow: "0 0 20px rgba(125,249,255,0.3)" }}>
                  {MONTH_NAMES[month]} {year}
                </h2>
                <div className="flex items-center gap-2 text-[10px] text-vector-white/40 font-mono">
                  <span className="h-2 w-2 bg-vector-blue animate-pulse" />
                  <span>AUTO-SCHEDULED — 1 NODE / DAY · SPACED REPETITION</span>
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {DAYS.map((d) => (
                  <div key={d} className="text-center text-[10px] font-mono tracking-widest text-vector-blue/50 py-2">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar cells */}
              <div className="grid grid-cols-7 gap-1 flex-1">
                {cells.map((day, idx) => {
                  if (!day) return <div key={`e_${idx}`} className="border border-vector-blue/5" />;
                  const blocks = reviewBlocks[day] || [];
                  const maxStatus = dayMaxStatus(day);
                  const sc = maxStatus ? statusColor(maxStatus) : null;
                  const isToday = day === todayDate;
                  const isSelected = day === selectedDay;

                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className="border p-1.5 cursor-pointer transition-all relative flex flex-col min-h-[60px]"
                      style={{
                        borderColor: isSelected ? "#7DF9FF" : isToday ? "rgba(125,249,255,0.4)" : "rgba(125,249,255,0.08)",
                        background: isSelected ? "rgba(125,249,255,0.05)" : "transparent",
                        boxShadow: isSelected ? "0 0 12px rgba(125,249,255,0.15)" : "none",
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className="text-[11px] font-mono"
                          style={{
                            color: isToday ? "#7DF9FF" : "rgba(255,255,255,0.5)",
                            fontWeight: isToday ? "bold" : "normal",
                          }}
                        >
                          {day}
                          {isToday && <span className="ml-1 text-[9px] text-vector-blue">●</span>}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        {blocks.slice(0, 2).map((b, i) => {
                          const bsc = statusColor(b.status);
                          return (
                            <div
                              key={i}
                              className="w-full px-1 py-0.5 text-[8px] font-mono truncate"
                              style={{ background: bsc.bg, color: bsc.text, border: `1px solid ${bsc.border}30` }}
                            >
                              {b.label}
                            </div>
                          );
                        })}
                        {blocks.length > 2 && (
                          <span className="text-[8px] font-mono text-vector-white/30">+{blocks.length - 2} more</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Day detail panel */}
            <div className="w-72 flex-shrink-0 border-l border-vector-blue/20 flex flex-col bg-vector-bg/30 overflow-y-auto custom-scrollbar">
              <div className="px-4 py-3 border-b border-vector-blue/20">
                <p className="text-[10px] text-vector-blue/50 font-mono tracking-widest uppercase">
                  {MONTH_NAMES[month]} {selectedDay}, {year}
                </p>
                {selectedDay === todayDate && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="h-1.5 w-1.5 bg-vector-blue animate-pulse" />
                    <span className="text-[10px] text-vector-blue font-mono tracking-widest">TODAY</span>
                  </div>
                )}
              </div>

              <div className="flex-1 p-4">
                {selectedBlocks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 gap-2">
                    <span className="material-symbols-outlined text-vector-blue/20 text-3xl">event_available</span>
                    <p className="text-[10px] text-vector-white/20 font-mono text-center">No nodes scheduled</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {selectedBlocks.map((block, i) => {
                      const sc = statusColor(block.status);
                      return (
                        <div
                          key={i}
                          className="border p-3 relative overflow-hidden"
                          style={{ borderColor: sc.border + "50", background: sc.bg }}
                        >
                          <div className="absolute left-0 top-0 bottom-0 w-0.5" style={{ background: sc.border }} />
                          <div className="flex items-start gap-2 mb-2">
                            <span className="material-symbols-outlined text-sm" style={{ color: sc.text }}>
                              {statusIcon(block.status)}
                            </span>
                            <span className="text-[11px] font-mono font-bold" style={{ color: sc.text }}>
                              {block.label}
                            </span>
                          </div>
                          {block.status === "rescheduled" && (
                            <p className="text-[9px] font-mono text-red-400/70 mb-1">Rescheduled — low quiz score</p>
                          )}
                          <div className="mt-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-[9px] font-mono text-vector-white/30">MASTERY</span>
                              <span className="text-[9px] font-mono" style={{ color: sc.text }}>
                                {Math.round(block.mastery * 100)}%
                              </span>
                            </div>
                            <div className="h-1 bg-vector-white/5">
                              <div className="h-full" style={{ width: `${block.mastery * 100}%`, background: sc.border }} />
                            </div>
                          </div>
                          <button
                            onClick={() => navigate(`/quiz?node=${encodeURIComponent(block.nodeId)}`)}
                            className="w-full mt-2 py-1.5 border text-[10px] font-mono tracking-widest uppercase transition-all hover:opacity-80"
                            style={{ borderColor: sc.border + "60", color: sc.text }}
                          >
                            LAUNCH QUIZ
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-vector-blue/20">
                <p className="text-[9px] font-mono text-vector-white/20 tracking-widest uppercase mb-2">STUDY_PLAN</p>
                <p className="text-[10px] font-mono text-vector-white/40 leading-relaxed">
                  1 node scheduled per day. Failed quizzes are rescheduled automatically.
                </p>
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  );
};

export default CalendarScreen;
