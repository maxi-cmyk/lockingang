import React from "react";

const MissionBriefingScreen = ({
  onClose,
  onEngage,
}) => {
  return (
    <div className="bg-vector-bg min-h-screen font-terminal overflow-hidden flex flex-col relative text-vector-white/80">
      {/* Background grid */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundSize: "40px 40px",
          backgroundImage:
            "linear-gradient(to right, rgba(125, 249, 255, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(125, 249, 255, 0.05) 1px, transparent 1px)",
        }}
      ></div>
      {/* Scanline */}
      <div
        className="absolute top-0 left-0 right-0 bottom-0 pointer-events-none z-10 opacity-30"
        style={{
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1))",
          backgroundSize: "100% 4px",
        }}
      ></div>

      {/* Decorative circles */}
      <div className="absolute right-[-10%] top-[10%] w-[600px] h-[600px] border border-vector-blue/5 rounded-full z-0 opacity-20 pointer-events-none"></div>
      <div className="absolute right-[-5%] top-[15%] w-[500px] h-[500px] border border-vector-blue/10 rounded-full z-0 opacity-20 pointer-events-none"></div>
      <div className="absolute left-[-10%] bottom-[-10%] w-[800px] h-[800px] border border-vector-blue/5 rounded-full z-0 opacity-10 pointer-events-none"></div>

      {/* Header */}
      <header className="relative z-20 h-14 flex items-center justify-between whitespace-nowrap border-b border-vector-blue/20 bg-vector-bg/90 backdrop-blur-sm px-6">
        <div className="flex items-center gap-4 text-vector-blue">
          <div className="text-vector-blue animate-pulse">
            <span className="material-symbols-outlined text-xl">radar</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-vector-white/60 font-mono tracking-wider">MISSION_BRIEFING</span>
            <span className="text-[12px] text-vector-blue font-bold">&gt;&gt;</span>
            <span className="text-[12px] text-vector-blue font-mono tracking-wider terminal-text">OP_CODE: 0x77A</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button className="flex items-center justify-center border border-vector-blue/30 hover:border-vector-blue hover:bg-vector-blue/10 transition-colors size-8 text-vector-blue">
            <span className="material-symbols-outlined text-base">terminal</span>
          </button>
          <button className="flex items-center justify-center border border-vector-blue/30 hover:border-vector-blue hover:bg-vector-blue/10 transition-colors size-8 text-vector-blue">
            <span className="material-symbols-outlined text-base">settings</span>
          </button>
          <div className="h-8 w-px bg-vector-blue/20 mx-1"></div>
          <div className="flex items-center gap-2 px-3 h-8 bg-vector-blue/10 border border-vector-blue/20">
            <div className="w-2 h-2 bg-green-500 animate-pulse"></div>
            <span className="text-[10px] font-bold text-vector-blue tracking-widest uppercase">SYSTEM_ONLINE</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="ml-2 flex items-center justify-center border border-red-500/30 hover:border-red-500/80 hover:bg-red-500/10 transition-colors size-8 text-red-500"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 sm:p-12 overflow-y-auto w-full">
        <div
          className="w-full max-w-5xl flex flex-col border-2 border-vector-blue bg-vector-bg/95 relative overflow-hidden"
          style={{ boxShadow: "0 0 10px rgba(125, 249, 255, 0.2), inset 0 0 10px rgba(125, 249, 255, 0.05)" }}
        >
          {/* Decorative corners */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-vector-blue z-20"></div>
          <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-vector-blue z-20"></div>
          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-vector-blue z-20"></div>
          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-vector-blue z-20"></div>

          {/* Card Header */}
          <div className="bg-vector-blue/10 border-b border-vector-blue/30 p-4 flex justify-between items-center">
            <h1 className="text-vector-blue tracking-widest text-sm font-bold uppercase terminal-text">
              MISSION BRIEFING
            </h1>
            <div className="flex gap-2 text-[10px] font-mono text-vector-blue/70 tracking-widest">
              <span>SECURE_CONN_ESTABLISHED</span>
              <span>::</span>
              <span>LATENCY: 12ms</span>
            </div>
          </div>

          {/* Card Body Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:divide-x divide-vector-blue/30 min-h-[400px]">
            {/* Left: Objective Overview */}
            <div className="lg:col-span-7 p-8 flex flex-col gap-8 relative">
              <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-vector-blue/5 to-transparent pointer-events-none"></div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-vector-blue text-sm">label_important</span>
                  <p className="text-vector-blue/60 text-[10px] font-bold tracking-widest uppercase">
                    OBJECTIVE_OVERVIEW
                  </p>
                </div>
                <h3 className="text-vector-white text-lg font-bold leading-tight mb-2 terminal-text uppercase tracking-tighter">
                  History Essay: Industrial Revolution
                </h3>
                <p className="text-vector-white/60 text-xs font-mono leading-relaxed max-w-xl">
                  Analyze the primary socio-economic causes of the Industrial
                  Revolution in 18th century Britain. Focus on technological
                  innovations and labor shifts.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6 mt-auto">
                <div className="border-l-2 border-vector-blue/40 pl-4 py-1">
                  <p className="text-vector-blue/60 text-[10px] font-bold tracking-widest uppercase mb-1">
                    DIFFICULTY_LEVEL
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 font-bold text-sm font-mono tracking-widest">HARD</span>
                    <div className="flex gap-0.5">
                      <div className="w-1.5 h-3 bg-red-400"></div>
                      <div className="w-1.5 h-3 bg-red-400"></div>
                      <div className="w-1.5 h-3 bg-red-400"></div>
                      <div className="w-1.5 h-3 bg-red-400/30"></div>
                      <div className="w-1.5 h-3 bg-red-400/30"></div>
                    </div>
                  </div>
                </div>

                <div className="border-l-2 border-vector-blue/40 pl-4 py-1">
                  <p className="text-vector-blue/60 text-[10px] font-bold tracking-widest uppercase mb-1">
                    FOCUS_TYPE
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-vector-blue text-base">psychology</span>
                    <span className="text-vector-white font-bold text-sm font-mono">Deep Work</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Intelligence Report */}
            <div className="lg:col-span-5 p-8 flex flex-col bg-black/20 relative group">
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-vector-blue text-sm">hub</span>
                  <p className="text-vector-blue/60 text-[10px] font-bold tracking-widest uppercase">
                    INTELLIGENCE_REPORT
                  </p>
                </div>
                <span className="text-[10px] text-vector-blue/40 font-mono">NODE_ID: 8821a</span>
              </div>

              <div className="flex-1 border border-vector-blue/20 bg-vector-bg/50 relative overflow-hidden flex items-center justify-center p-4">
                <div
                  className="absolute inset-0 opacity-30"
                  style={{ backgroundImage: "radial-gradient(#7DF9FF 1px, transparent 1px)", backgroundSize: "20px 20px" }}
                ></div>
                <div className="relative w-full h-full min-h-[200px]">
                  <svg className="w-full h-full drop-shadow-[0_0_8px_rgba(125,249,255,0.3)]" fill="none" height="100%" viewBox="0 0 300 200" width="100%">
                    <path d="M150 100 L 80 60" stroke="#7DF9FF" strokeOpacity="0.6" strokeWidth="1"></path>
                    <path d="M150 100 L 220 70" stroke="#7DF9FF" strokeOpacity="0.6" strokeWidth="1"></path>
                    <path d="M150 100 L 120 160" stroke="#7DF9FF" strokeOpacity="0.6" strokeWidth="1"></path>
                    <path d="M80 60 L 60 120" stroke="#7DF9FF" strokeDasharray="4 2" strokeOpacity="0.4" strokeWidth="0.5"></path>
                    <circle cx="150" cy="100" fill="#0D0221" r="6" stroke="#7DF9FF" strokeWidth="2"></circle>
                    <circle className="animate-ping" cx="150" cy="100" r="12" stroke="#7DF9FF" strokeOpacity="0.3" strokeWidth="1" style={{ animationDuration: "3s" }}></circle>
                    <circle cx="80" cy="60" fill="#0D0221" r="4" stroke="#7DF9FF" strokeWidth="1.5"></circle>
                    <circle cx="220" cy="70" fill="#0D0221" r="4" stroke="#7DF9FF" strokeWidth="1.5"></circle>
                    <circle cx="120" cy="160" fill="#0D0221" r="4" stroke="#7DF9FF" strokeWidth="1.5"></circle>
                    <circle cx="60" cy="120" fill="#0D0221" opacity="0.7" r="3" stroke="#7DF9FF" strokeWidth="1"></circle>
                    <text fill="#7DF9FF" fontFamily="monospace" fontSize="10" opacity="0.8" x="160" y="95">CURRENT_TASK</text>
                    <text fill="#7DF9FF" fontFamily="monospace" fontSize="8" opacity="0.6" x="85" y="55">Eco.Factors</text>
                    <text fill="#7DF9FF" fontFamily="monospace" fontSize="8" opacity="0.6" x="225" y="65">Steam_Pwr</text>
                    <text fill="#7DF9FF" fontFamily="monospace" fontSize="8" opacity="0.6" x="125" y="165">Labor_Laws</text>
                  </svg>
                </div>

                <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm border border-vector-blue/20 p-2 text-[11px] text-vector-white/60 font-mono">
                  <span className="text-vector-blue">&gt;</span> LINKED: '18th Century Economics', 'Steam Power'
                </div>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="border-t border-vector-blue/30 bg-vector-blue/5 p-6 grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center justify-center border border-vector-blue/20 bg-vector-bg/40 p-4 relative overflow-hidden group hover:border-vector-blue/50 transition-colors">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-vector-blue to-transparent opacity-50"></div>
              <p className="text-vector-blue/60 text-[10px] font-bold tracking-widest mb-1 uppercase">PROJECTED_XP</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-vector-white tracking-tighter font-mono">250</span>
                <span className="text-sm text-vector-blue font-bold">XP</span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center border border-vector-blue/20 bg-vector-bg/40 p-4 relative overflow-hidden group hover:border-vector-blue/50 transition-colors">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-vector-blue to-transparent opacity-50"></div>
              <p className="text-vector-blue/60 text-[10px] font-bold tracking-widest mb-1 uppercase">ESTIMATED_TIME</p>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-vector-white tracking-tighter font-mono">25:00</span>
                <span className="text-sm text-vector-blue font-bold">MIN</span>
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-8 bg-vector-bg border-t border-vector-blue/30 flex justify-center relative overflow-hidden">
            <div
              className="absolute inset-0 bg-vector-blue/5 opacity-0 hover:opacity-100 transition-opacity duration-500"
              style={{ backgroundImage: "radial-gradient(circle, rgba(125,249,255,0.1) 0%, transparent 70%)" }}
            ></div>
            <button
              onClick={onEngage}
              className="relative group cursor-pointer w-full max-w-md"
            >
              <div className="absolute -inset-1 bg-gradient-to-r from-vector-blue via-blue-400 to-vector-blue blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative flex items-center justify-center bg-vector-blue hover:brightness-110 text-vector-bg h-14 px-8 text-sm font-bold tracking-widest uppercase transition-all shadow-card-glow hover:shadow-card-glow-hover font-mono">
                <span className="material-symbols-outlined mr-3 animate-[spin_3s_linear_infinite]">api</span>
                <span className="truncate">ENGAGE_ZEN_MODE</span>
                <span className="material-symbols-outlined ml-2 opacity-0 group-hover:opacity-100 transition-opacity -mr-6 group-hover:mr-0">arrow_forward</span>
              </div>
            </button>
          </div>
        </div>

        {/* Bottom context */}
        <div className="mt-8 text-vector-blue/40 text-[10px] font-mono text-center tracking-widest">
          <p>UGTA_SYSTEM_V.4.2.1 // READY_FOR_DEPLOYMENT</p>
          {onClose && <p className="mt-1">PRESS 'ESC' TO ABORT MISSION</p>}
        </div>
      </main>
    </div>
  );
};

export default MissionBriefingScreen;
