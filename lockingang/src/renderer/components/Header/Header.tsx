import React from "react";

const Header: React.FC = () => {
  return (
    <header className="h-14 border-b border-vector-blue flex items-center justify-between px-6 backdrop-blur-md bg-vector-bg/40 z-10 w-full">
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-vector-white/60 font-mono tracking-wider">
          DASHBOARD
        </span>
        <span className="text-[10px] text-vector-blue font-bold">&gt;&gt;</span>
        <span className="text-[10px] text-vector-blue font-mono tracking-wider terminal-text">
          MISSION_CONTROL
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="px-3 py-1 border border-vector-blue/30 bg-vector-bg text-[8px] text-vector-blue tracking-widest">
          SYSTEM_NORMAL
        </div>
        <div className="text-vector-blue cursor-pointer hover:text-white transition-colors">
          <span className="material-symbols-outlined text-[20px]">
            notifications
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
