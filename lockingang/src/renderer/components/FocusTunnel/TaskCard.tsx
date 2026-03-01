import React from "react";

export interface TaskData {
  id: string;
  title: string;
  description: string;
  status: "ACTIVE" | "EXECUTING" | "OPEN";
  duration?: string;
  timeRemaining?: string;
  details?: string;
  transform: string;
  zIndex: number;
}

interface TaskCardProps {
  task: TaskData;
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  if (task.status === "OPEN") {
    return (
      <div
        className="fan-card w-[280px] h-[400px] bg-transparent border-2 border-dashed border-vector-blue/30 flex flex-col items-center justify-center p-5 cursor-pointer group hover:bg-vector-blue/5 hover:border-vector-blue/60 transition-colors"
        style={{ transform: task.transform, zIndex: task.zIndex }}
      >
        <span className="material-symbols-outlined text-vector-blue/30 group-hover:text-vector-blue text-[32px] group-hover:scale-110 transition-transform mb-3">
          add_circle
        </span>
        <h3 className="text-[9px] text-vector-blue/30 group-hover:text-vector-blue uppercase tracking-[0.2em]">
          Add_Task
        </h3>
        <p className="text-[7px] text-vector-blue/20 font-mono mt-2 group-hover:text-vector-blue/50">
          OPEN_SLOT
        </p>
      </div>
    );
  }

  if (task.status === "EXECUTING") {
    return (
      <div
        className="fan-card w-[320px] h-[460px] bg-[#0D0221] vector-glow flex flex-col p-6 relative overflow-hidden"
        style={{ transform: task.transform, zIndex: task.zIndex }}
      >
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#7DF9FF 1px, transparent 1px)",
            backgroundSize: "15px 15px",
          }}
        ></div>
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 bg-vector-blue shadow-[0_0_8px_#7DF9FF] animate-pulse"></div>
            <span className="text-[8px] tracking-widest text-vector-blue uppercase">
              EXECUTING
            </span>
          </div>
          <div className="text-lg font-mono text-vector-white terminal-text">
            {task.timeRemaining}
          </div>
        </div>

        <div className="relative z-10 flex-1 flex flex-col">
          <h2 className="text-sm text-vector-white mb-4 uppercase tracking-tighter leading-snug">
            {task.title}
          </h2>
          <p className="text-[11px] text-vector-white/70 font-mono mb-6 leading-loose border-l-2 border-vector-blue/40 pl-3">
            {task.description}
          </p>

          <div className="mt-auto flex flex-col gap-2">
            <button className="w-full bg-vector-blue text-vector-bg py-3 text-[9px] transition-all hover:brightness-110 active:scale-95 uppercase tracking-widest font-bold">
              MARK_COMPLETE
            </button>
            <button className="w-full border border-vector-blue py-2 text-vector-blue hover:bg-vector-blue/10 transition-colors flex justify-center">
              <span className="material-symbols-outlined text-[16px]">
                pause
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE status
  return (
    <div
      className="fan-card w-[280px] h-[400px] bg-[#0D0221] border border-vector-blue shadow-card-glow hover:shadow-card-glow-hover flex flex-col p-5 cursor-pointer group"
      style={{ transform: task.transform, zIndex: task.zIndex }}
    >
      <div className="flex justify-between items-center mb-4 opacity-70">
        <span className="text-[8px] text-vector-blue/60 uppercase tracking-widest">
          {task.id}
        </span>
        <span className="material-symbols-outlined text-vector-blue/40 text-[16px]">
          drag_pan
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <h2 className="text-xs text-vector-white uppercase leading-relaxed">
          {task.title}
        </h2>
        <p className="text-[9px] text-vector-white/40 font-mono mt-2 leading-relaxed">
          {task.description}
        </p>
      </div>

      <div className="mt-auto border-t border-vector-blue/20 pt-3 flex gap-2 items-center opacity-70">
        <span className="text-[8px] text-vector-blue/60 border border-vector-blue/20 px-2 py-1 uppercase tracking-tighter">
          {task.duration}
        </span>
      </div>
    </div>
  );
};

export default TaskCard;
