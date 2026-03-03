import React, { useState, useEffect } from "react";
import TaskCard from "./TaskCard";
import { subscribe, getTodaySchedule, getState } from "../../studyStore";

const FocusTunnel = ({ onStart }) => {
  const [studyState, setStudyState] = useState(getState());

  useEffect(() => {
    const unsub = subscribe((s) => setStudyState({ ...s }));
    return unsub;
  }, []);

  const todayBlocks = getTodaySchedule();

  // Map scheduled blocks to TaskCard-compatible objects
  const tasks = todayBlocks.slice(0, 3).map((block) => {
    const node = studyState.nodes.find((n) => n.id === block.nodeId);
    const mastery = node?.mastery ?? 0;
    const priority =
      mastery === 0 ? "normal" : mastery < 0.3 ? "critical" : mastery < 0.7 ? "warning" : "normal";

    return {
      id: block.nodeId,
      title: block.nodeLabel || block.nodeId,
      description: node?.description || "Scheduled for today's study session.",
      status: block.status === "rescheduled" ? "RESCHEDULED" : "ACTIVE",
      duration: "25m",
      priority,
    };
  });

  const hasData = studyState.nodes.length > 0;

  return (
    <div className="flex-[3] relative flex flex-col bg-vector-bg/20 overflow-hidden">
      {/* Header */}
      <div className="absolute top-6 left-6 z-10">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-vector-blue text-[20px]">rocket_launch</span>
          <h2 className="text-xs uppercase tracking-[0.3em] terminal-text text-vector-white">
            Focus_Tunnel
          </h2>
        </div>
        <p className="text-[9px] text-vector-blue/60 font-mono mt-1 pl-8">
          {hasData
            ? tasks.length > 0
              ? `TODAY'S QUEUE [${tasks.length}_SLOT${tasks.length !== 1 ? "S" : ""}]`
              : "ALL CAUGHT UP FOR TODAY"
            : "NO STUDY TREE LOADED"}
        </p>
      </div>

      {/* Cards or empty state */}
      <div className="flex-1 flex items-center justify-evenly gap-6 px-8 pt-16">
        {tasks.length > 0 ? (
          tasks.map((task, index) => (
            <TaskCard key={index} task={task} onStart={onStart} />
          ))
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="material-symbols-outlined text-vector-blue/15 text-[64px]">
              {hasData ? "check_circle" : "account_tree"}
            </span>
            <p className="text-[10px] text-vector-white/20 font-mono leading-relaxed">
              {hasData
                ? "No nodes scheduled for today.\nCheck the calendar for upcoming sessions."
                : "Upload a study document in\nTemplate to build your study plan."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FocusTunnel;
