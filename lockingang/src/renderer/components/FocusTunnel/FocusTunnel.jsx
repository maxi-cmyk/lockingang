import React from "react";
import TaskCard from "./TaskCard";

const FocusTunnel = ({ onStart }) => {
  const tasks = [
    {
      id: "COMMON_DIST",
      title: "Common Distributions",
      description: "Normal, Binomial, Poisson. CRITICAL — mastery at 20%.",
      status: "ACTIVE",
      duration: "30m",
      priority: "critical",
    },
    {
      id: "HYPOTHESIS_TEST",
      title: "Hypothesis Testing",
      description: "p-values, null hypothesis, significance levels.",
      status: "ACTIVE",
      duration: "20m",
      priority: "warning",
    },
    {
      id: "PROBABILITY_REVIEW",
      title: "Probability Refresher",
      description: "Quick review to maintain 0.92 mastery score.",
      status: "OPEN",
      duration: "15m",
      priority: "normal",
    },
  ];

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
        <p className="text-[1rem] text-vector-blue/60 font-mono mt-1 pl-8">
          ACTIVE QUEUE [3_SLOTS] — CS105 STATS SESSION
        </p>
      </div>

      {/* Cards */}
      <div className="flex-1 flex items-center justify-evenly gap-6 px-8 pt-16">
        {tasks.map((task, index) => (
          <TaskCard key={index} task={task} onStart={onStart} />
        ))}
      </div>
    </div>
  );
};

export default FocusTunnel;
