import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import Header from "../components/Header/Header";
import FocusTunnel from "../components/FocusTunnel/FocusTunnel";
import ZenModeTimer from "./ZenModeTimer";
import MissionCompleteScreen from "./MissionCompleteScreen";

const URGENCY = [
  { id: "COMMON_DIST", label: "Common Distributions", mastery: 0.20, status: "critical", dueIn: "NOW", icon: "bar_chart" },
  { id: "NORMAL_DIST", label: "Normal Distribution", mastery: 0.15, status: "critical", dueIn: "5h", icon: "area_chart" },
  { id: "CENTRAL_LIMIT", label: "Central Limit Thm", mastery: 0.48, status: "active", dueIn: "2d", icon: "trending_up" },
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

  const handleStart = (task) => { setActiveTask(task); setPhase("timer"); };
  const handleComplete = (elapsed) => { setTimeSpent(elapsed ?? 25 * 60); setPhase("complete"); };
  const handleGiveUp = () => { setPhase("dashboard"); setActiveTask(null); };
  const handleReEnter = () => setPhase("timer");
  const handleReturnToBase = () => { setPhase("dashboard"); setActiveTask(null); };

  return (
    <div className="h-screen flex overflow-hidden bg-vector-bg text-vector-white font-terminal relative [&_p]:!text-base">
      <div className="scanline" />
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10">
        <Header />

        <div className="flex-1 flex overflow-hidden">

          {/* ── Left briefing panel ── */}
          <div className="w-72 flex-shrink-0 border-r border-vector-blue/20 flex flex-col overflow-y-auto custom-scrollbar bg-vector-bg/30">

            {/* Student header */}
            <div className="px-5 py-4 border-b border-vector-blue/20">
              <p className="text-[8px] text-vector-blue/50 font-mono tracking-widest uppercase mb-1">DAILY_BRIEFING</p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-400 animate-pulse" />
                <p className="text-[10px] text-vector-white font-mono tracking-widest">MARTY — CS105 STATS</p>
              </div>
              <p className="text-[8px] text-vector-white/40 font-mono mt-0.5">11 nodes tracked · Session #14</p>
            </div>

            {/* Mastery overview */}
            <div className="px-5 py-4 border-b border-vector-blue/20">
              <p className="text-[8px] text-vector-blue/50 font-mono tracking-widest uppercase mb-3">MASTERY_OVERVIEW</p>
              <div className="flex flex-col gap-2">
                {[
                  { label: "MASTERED", count: 5, total: 11, color: "#7DF9FF" },
                  { label: "IN PROGRESS", count: 4, total: 11, color: "#FFB800" },
                  { label: "CRITICAL", count: 2, total: 11, color: "#FF4444" },
                ].map(({ label, count, total, color }) => (
                  <div key={label}>
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[8px] font-mono tracking-widest" style={{ color }}>{label}</p>
                      <p className="text-[8px] font-mono text-vector-white/50">{count}/{total}</p>
                    </div>
                    <div className="h-1 bg-vector-white/5 w-full">
                      <div
                        className="h-full transition-all duration-700"
                        style={{ width: `${(count / total) * 100}%`, background: color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Urgency queue */}
            <div className="px-5 py-4 border-b border-vector-blue/20">
              <p className="text-[8px] text-vector-blue/50 font-mono tracking-widest uppercase mb-3">URGENCY_QUEUE</p>
              <div className="flex flex-col gap-2">
                {URGENCY.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => navigate(`/quiz?node=${node.id}`)}
                    className="group flex items-center gap-3 p-2 border transition-all text-left"
                    style={{ borderColor: `${statusColor(node.status)}30` }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = statusColor(node.status)}
                    onMouseLeave={e => e.currentTarget.style.borderColor = `${statusColor(node.status)}30`}
                  >
                    <p
                      className="material-symbols-outlined text-base shrink-0"
                      style={{ color: statusColor(node.status) }}
                    >
                      {node.icon}
                    </p>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-mono text-vector-white truncate">{node.label}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="h-1 flex-1 bg-vector-white/5">
                          <div
                            className="h-full"
                            style={{ width: `${node.mastery * 100}%`, background: statusColor(node.status) }}
                          />
                        </div>
                        <p className="text-[8px] font-mono" style={{ color: statusColor(node.status) }}>
                          {Math.round(node.mastery * 100)}%
                        </p>
                      </div>
                    </div>
                    <p
                      className="text-[7px] font-mono tracking-widest shrink-0 px-1.5 py-0.5 border"
                      style={{ color: statusColor(node.status), borderColor: `${statusColor(node.status)}50` }}
                    >
                      {node.dueIn}
                    </p>
                  </button>
                ))}
              </div>
              <button
                onClick={() => navigate("/quiz?node=COMMON_DIST")}
                className="w-full mt-3 py-2 border border-red-500/50 text-red-400 text-[8px] font-mono tracking-widest uppercase hover:bg-red-500/10 transition-all flex items-center justify-center gap-2"
              >
                <p className="material-symbols-outlined text-sm">psychology</p>
                QUIZ ME NOW
              </button>
            </div>

            {/* 7-day forgetting forecast */}
            <div className="px-5 py-4">
              <p className="text-[8px] text-vector-blue/50 font-mono tracking-widest uppercase mb-3">FORGETTING_FORECAST</p>
              <div className="flex items-end gap-1 h-16">
                {FORECAST.map(({ day, count }) => (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full transition-all duration-500"
                      style={{
                        height: count === 0 ? 4 : `${(count / 4) * 100}%`,
                        background: count >= 3 ? "#FF4444" : count >= 2 ? "#FFB800" : count >= 1 ? "#7DF9FF" : "rgba(125,249,255,0.1)",
                        minHeight: 4,
                      }}
                    />
                    <p className="text-[6px] font-mono text-vector-white/30">{day}</p>
                  </div>
                ))}
              </div>
              <p className="text-[7px] text-vector-white/30 font-mono mt-2">
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
