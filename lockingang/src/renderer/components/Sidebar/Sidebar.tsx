import React from "react";

const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 flex-shrink-0 border-r border-vector-blue flex flex-col justify-between h-full bg-vector-bg/80 backdrop-blur-sm z-20">
      <div>
        <div className="p-6 border-b border-vector-blue">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 border border-vector-blue p-1">
                <div
                  className="h-full w-full bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCK4_TDWy0cSfYLlMGqh0G0ymA1sS4sdbcmibPn-99G80KZd5aA0NQnNnzXt2AMwCBUe0TIO_f1WwVlqYL1pyU1v3twe3FCrrDpt6mY4QQBvs1HlKfyQjvRrDQ9KNFctln1kG1NsBNTJJupSqwWLbXbelTehaq_Ii5qCKeDKf__KdhmEAELoeuL3QOKwfMONyGl8HH_Uk6-ULycqolDmiyO6glhUa0ZWF0biFKMmUlEXSaRPP0-XPuwh7Xkm5b2AayPNr5eLJnZFUQ')",
                    imageRendering: "pixelated",
                  }}
                ></div>
              </div>
              <div className="flex flex-col gap-1">
                <h1 className="text-[10px] leading-tight terminal-text uppercase tracking-tighter text-vector-blue">
                  LOCK_IN_GANG_OS
                </h1>
                <p className="text-[8px] text-vector-white/70 uppercase">
                  Student_ID: #8842
                </p>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex flex-col gap-1 p-3 mt-2">
          <a
            className="flex items-center gap-3 px-3 py-3 border border-transparent text-vector-white/60 hover:text-vector-blue hover:border-vector-blue/30 transition-all group"
            href="#"
          >
            <span className="material-symbols-outlined text-[18px]">
              account_tree
            </span>
            <span className="text-[9px] tracking-widest uppercase">
              Knowledge Tree
            </span>
          </a>
          <a
            className="flex items-center gap-3 px-3 py-3 border border-vector-blue bg-vector-blue/10 text-vector-white transition-all group"
            href="#"
          >
            <span className="material-symbols-outlined text-[18px] text-vector-blue">
              dashboard
            </span>
            <span className="text-[9px] tracking-widest uppercase">
              Dashboard
            </span>
          </a>
          <a
            className="flex items-center gap-3 px-3 py-3 border border-transparent text-vector-white/60 hover:text-vector-blue hover:border-vector-blue/30 transition-all group"
            href="#"
          >
            <span className="material-symbols-outlined text-[18px]">
              rocket_launch
            </span>
            <span className="text-[9px] tracking-widest uppercase">
              Focus Tunnel
            </span>
          </a>
          <a
            className="flex items-center gap-3 px-3 py-3 border border-transparent text-vector-white/60 hover:text-vector-blue hover:border-vector-blue/30 transition-all group"
            href="#"
          >
            <span className="material-symbols-outlined text-[18px]">chat</span>
            <span className="text-[9px] tracking-widest uppercase">
              Chatbot
            </span>
          </a>
          <a
            className="flex items-center gap-3 px-3 py-3 border border-transparent text-vector-white/60 hover:text-vector-blue hover:border-vector-blue/30 transition-all group"
            href="#"
          >
            <span className="material-symbols-outlined text-[18px]">
              inventory_2
            </span>
            <span className="text-[9px] tracking-widest uppercase">
              Templates
            </span>
          </a>
          <a
            className="flex items-center gap-3 px-3 py-3 border border-transparent text-vector-white/60 hover:text-vector-blue hover:border-vector-blue/30 transition-all group"
            href="#"
          >
            <span className="material-symbols-outlined text-[18px]">
              calendar_month
            </span>
            <span className="text-[9px] tracking-widest uppercase">
              Calendar & Schedule
            </span>
          </a>
        </nav>
      </div>

      <div>
        <div className="px-5 pb-5">
          <div className="p-3 border border-vector-blue/40 space-y-3 bg-vector-blue/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[8px] text-vector-blue/60 mb-1 tracking-widest">
                  SESSION_UPTIME
                </p>
                <span className="text-sm terminal-text text-vector-white font-mono">
                  04:20:59
                </span>
              </div>
              <span className="material-symbols-outlined text-vector-blue text-[16px] animate-pulse">
                timer
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-vector-blue/30 flex justify-between items-center">
          <span className="text-[8px] text-vector-white/40">
            v3.0.0-hackathon
          </span>
          <div className="flex gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[8px] text-vector-blue">ONLINE</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
