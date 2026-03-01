import React from "react";
import TaskCard, { TaskData } from "./TaskCard";

const FocusTunnel: React.FC = () => {
  const tasks: TaskData[] = [
    {
      id: "PROCESS_02",
      title: "Biology Ch.4: Mitosis",
      description: "Diagram synthesis & phase ID.",
      status: "ACTIVE",
      duration: "1h 30m",
      transform: "rotate(-10deg) translateX(-40px) translateY(20px)",
      zIndex: 5,
    },
    {
      id: "PROCESS_01",
      title: "Finalize Thesis Intro",
      description: "Re-evaluating framework based on Q3 review notes.",
      status: "EXECUTING",
      timeRemaining: "24:12",
      transform: "rotate(0deg) translateY(-20px)",
      zIndex: 20,
    },
    {
      id: "OPEN_SLOT",
      title: "Add_Task",
      description: "OPEN_SLOT",
      status: "OPEN",
      transform: "rotate(10deg) translateX(40px) translateY(20px)",
      zIndex: 5,
    },
  ];

  return (
    <div className="flex-[3] relative flex flex-col border-r border-vector-blue/20 bg-vector-bg/20">
      <div className="absolute top-6 left-6 z-10">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-vector-blue text-[20px]">
            rocket_launch
          </span>
          <h2 className="text-xs uppercase tracking-[0.3em] terminal-text text-vector-white">
            Focus_Tunnel
          </h2>
        </div>
        <p className="text-[9px] text-vector-blue/60 font-mono mt-1 pl-8">
          ACTIVE QUEUE [3_SLOTS]
        </p>
      </div>

      <div className="flex-1 relative card-fan-container">
        {tasks.map((task, index) => (
          <TaskCard key={index} task={task} />
        ))}
      </div>

      <div className="absolute bottom-6 w-full text-center z-0 pointer-events-none">
        <p className="text-[8px] text-vector-blue/30 font-mono uppercase tracking-widest">
          /// RULE_OF_3: CONSTRAINED_WORKFLOW ///
        </p>
      </div>
    </div>
  );
};

export default FocusTunnel;
