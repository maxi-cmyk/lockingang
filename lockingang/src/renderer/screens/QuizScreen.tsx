import React from "react";
import Sidebar from "../components/Sidebar/Sidebar";

const QuizScreen: React.FC = () => {
  return (
    <div
      className="bg-[#f5f8f8] dark:bg-[#0D0221] text-slate-900 dark:text-slate-100 font-['Space_Grotesk'] min-h-screen flex overflow-x-hidden bg-[length:40px_40px]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(125, 249, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(125, 249, 255, 0.05) 1px, transparent 1px)",
      }}
    >
      {/* Assuming the Sidebar should be kept, if the user meant to just keep the global sidebar */}
      <Sidebar />

      <div className="layout-container flex h-full grow flex-col overflow-y-auto custom-scrollbar relative">
        <style>
          {`
            .custom-scrollbar::-webkit-scrollbar {
              width: 8px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: #0D0221;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background: #2e1a5e;
              border-radius: 4px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: #80f9ff;
            }
          `}
        </style>

        {/* Top Navigation */}
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-[#80f9ff]/20 bg-[#0D0221]/80 backdrop-blur-sm sticky top-0 z-50 px-6 py-3">
          <div className="flex items-center gap-4 text-[#80f9ff]">
            <div className="size-6 text-[#80f9ff]">
              <span className="material-symbols-outlined text-2xl">
                grid_view
              </span>
            </div>
            <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] font-['Space_Grotesk']">
              UGTA_FOCUS_MAN // v1.0
            </h2>
          </div>

          <div className="flex gap-3">
            <button className="flex min-w-[120px] cursor-pointer items-center justify-center overflow-hidden rounded border border-[#80f9ff]/30 hover:border-[#80f9ff] bg-[#80f9ff]/10 hover:bg-[#80f9ff]/20 text-[#80f9ff] text-sm font-bold leading-normal tracking-[0.05em] h-10 px-4 transition-all duration-200 group">
              <span className="truncate mr-2">EXIT_QUIZ</span>
              <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">
                logout
              </span>
            </button>
            <div className="h-10 w-[1px] bg-[#80f9ff]/20 mx-1"></div>
            <button className="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded border border-[#80f9ff]/30 hover:border-[#80f9ff] bg-[#0D0221] text-white hover:text-[#80f9ff] transition-colors">
              <span className="material-symbols-outlined">terminal</span>
            </button>
            <button className="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded border border-[#80f9ff]/30 hover:border-[#80f9ff] bg-[#0D0221] text-white hover:text-[#80f9ff] transition-colors">
              <span className="material-symbols-outlined">
                picture_in_picture_alt
              </span>
            </button>
            <button className="flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded border border-[#80f9ff]/30 hover:border-[#80f9ff] bg-[#0D0221] text-white hover:text-[#80f9ff] transition-colors">
              <span className="material-symbols-outlined">settings</span>
            </button>
          </div>
        </header>

        <main className="flex-1 flex justify-center py-8 px-4 sm:px-8">
          <div className="w-full max-w-6xl flex flex-col gap-6">
            {/* Breadcrumb & Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded bg-[#150b2e] border border-[#80f9ff]/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#80f9ff]/50 text-xl">
                  hub
                </span>
                <a
                  className="text-[#80f9ff]/70 hover:text-[#80f9ff] transition-colors text-sm font-medium tracking-wide"
                  href="#system"
                >
                  SYSTEM_PROCESS
                </a>
                <span className="text-[#80f9ff]/40 text-sm font-medium">
                  &gt;&gt;
                </span>
                <span className="text-white text-sm font-bold tracking-wide uppercase shadow-[0_0_10px_rgba(128,249,255,0.2)]">
                  NODE_VALIDATION: [Quantum_Mechanics]
                </span>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#80f9ff]">
                    bolt
                  </span>
                  <span className="text-xs text-[#80f9ff]/70 uppercase font-bold">
                    Latency: 12ms
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-400">
                    wifi
                  </span>
                  <span className="text-xs text-green-400 uppercase font-bold">
                    Online
                  </span>
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Quiz Interface */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                {/* Question Card */}
                <div className="relative group rounded-lg overflow-hidden border border-[#80f9ff] bg-[#150b2e] shadow-[0_0_15px_rgba(128,249,255,0.15)] transition-all duration-300 hover:shadow-[0_0_25px_rgba(128,249,255,0.25)]">
                  {/* Decorative corner accents */}
                  <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-[#80f9ff]"></div>
                  <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-[#80f9ff]"></div>
                  <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-[#80f9ff]"></div>
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-[#80f9ff]"></div>

                  {/* Header */}
                  <div className="px-6 py-4 border-b border-[#80f9ff]/20 flex justify-between items-center bg-[#80f9ff]/5">
                    <h3 className="text-[#80f9ff] font-bold tracking-wider text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">
                        psychology
                      </span>
                      NODE_QUERY_001 // PRIMARY_FUNCTION
                    </h3>
                    <button className="text-xs font-mono text-[#80f9ff]/60 hover:text-[#80f9ff] flex items-center gap-1 border border-[#80f9ff]/20 px-2 py-1 rounded hover:bg-[#80f9ff]/10 transition-colors">
                      <span className="material-symbols-outlined text-sm">
                        code
                      </span>{" "}
                      view_source
                    </button>
                  </div>

                  {/* Question Body */}
                  <div className="p-8">
                    <div className="mb-6">
                      <p className="text-slate-200 text-xl md:text-2xl font-medium leading-relaxed font-['Space_Grotesk']">
                        Identify the core principle defining the{" "}
                        <span className="text-[#80f9ff] font-bold border-b border-[#80f9ff]/40">
                          Heisenberg Uncertainty Principle
                        </span>{" "}
                        within this context.
                      </p>
                    </div>

                    {/* Illustration/Code Snippet Placeholder */}
                    <div className="w-full h-48 bg-black/40 rounded border border-[#80f9ff]/10 flex items-center justify-center overflow-hidden relative mb-2">
                      <div
                        className="absolute inset-0 opacity-30"
                        style={{
                          backgroundImage:
                            "radial-gradient(#80f9ff 1px, transparent 1px)",
                          backgroundSize: "20px 20px",
                        }}
                      ></div>
                      <div className="text-[#80f9ff]/40 font-mono text-xs p-4 w-full h-full overflow-hidden z-10">
                        &gt; QUANTUM_STATE_ANALYZING...
                        <br />
                        &gt; DELTA_X * DELTA_P &gt;= H_BAR / 2<br />
                        &gt; OBSERVATION_EFFECT_DETECTED
                        <br />
                        &gt; CALCULATING PROBABILITY WAVES...
                        <br />
                        <span className="animate-pulse">_</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Answer Options */}
                <div className="grid grid-cols-1 gap-3">
                  <button className="group relative flex items-center w-full p-4 rounded bg-[#150b2e] border border-[#2e1a5e] hover:border-[#80f9ff] hover:bg-[#80f9ff]/5 transition-all duration-200 text-left">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2e1a5e] group-hover:bg-[#80f9ff] transition-colors"></div>
                    <span className="flex items-center justify-center size-8 rounded bg-[#2e1a5e] text-[#80f9ff] font-bold mr-4 group-hover:bg-[#80f9ff] group-hover:text-black transition-colors shrink-0">
                      A
                    </span>
                    <span className="text-slate-300 font-medium group-hover:text-white text-base md:text-lg">
                      Position and momentum cannot be simultaneously determined
                      with precision.
                    </span>
                  </button>
                  <button className="group relative flex items-center w-full p-4 rounded bg-[#150b2e] border border-[#2e1a5e] hover:border-[#80f9ff] hover:bg-[#80f9ff]/5 transition-all duration-200 text-left">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2e1a5e] group-hover:bg-[#80f9ff] transition-colors"></div>
                    <span className="flex items-center justify-center size-8 rounded bg-[#2e1a5e] text-[#80f9ff] font-bold mr-4 group-hover:bg-[#80f9ff] group-hover:text-black transition-colors shrink-0">
                      B
                    </span>
                    <span className="text-slate-300 font-medium group-hover:text-white text-base md:text-lg">
                      Energy is conserved in isolated systems regardless of
                      observation.
                    </span>
                  </button>
                  <button className="group relative flex items-center w-full p-4 rounded bg-[#150b2e] border border-[#2e1a5e] hover:border-[#80f9ff] hover:bg-[#80f9ff]/5 transition-all duration-200 text-left">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2e1a5e] group-hover:bg-[#80f9ff] transition-colors"></div>
                    <span className="flex items-center justify-center size-8 rounded bg-[#2e1a5e] text-[#80f9ff] font-bold mr-4 group-hover:bg-[#80f9ff] group-hover:text-black transition-colors shrink-0">
                      C
                    </span>
                    <span className="text-slate-300 font-medium group-hover:text-white text-base md:text-lg">
                      Particles exhibit wave-like properties only when not
                      observed.
                    </span>
                  </button>
                  <button className="group relative flex items-center w-full p-4 rounded bg-[#150b2e] border border-[#2e1a5e] hover:border-[#80f9ff] hover:bg-[#80f9ff]/5 transition-all duration-200 text-left">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#2e1a5e] group-hover:bg-[#80f9ff] transition-colors"></div>
                    <span className="flex items-center justify-center size-8 rounded bg-[#2e1a5e] text-[#80f9ff] font-bold mr-4 group-hover:bg-[#80f9ff] group-hover:text-black transition-colors shrink-0">
                      D
                    </span>
                    <span className="text-slate-300 font-medium group-hover:text-white text-base md:text-lg">
                      Time is relative to the observer's velocity through space.
                    </span>
                  </button>
                </div>
              </div>

              {/* Right Column: Stats & Context */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1 rounded p-4 bg-[#150b2e] border border-[#80f9ff]/30 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 text-[#80f9ff]/5 group-hover:text-[#80f9ff]/10 transition-colors">
                      <span className="material-symbols-outlined text-[80px]">
                        local_fire_department
                      </span>
                    </div>
                    <p className="text-[#80f9ff]/70 text-xs font-bold tracking-wider uppercase z-10">
                      Current Streak
                    </p>
                    <p className="text-white text-3xl font-bold leading-tight z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                      12
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 rounded p-4 bg-[#150b2e] border border-[#80f9ff]/30 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 text-[#80f9ff]/5 group-hover:text-[#80f9ff]/10 transition-colors">
                      <span className="material-symbols-outlined text-[80px]">
                        military_tech
                      </span>
                    </div>
                    <p className="text-[#80f9ff]/70 text-xs font-bold tracking-wider uppercase z-10">
                      XP Reward
                    </p>
                    <p className="text-[#80f9ff] text-3xl font-bold leading-tight z-10 drop-shadow-[0_0_8px_rgba(128,249,255,0.5)]">
                      +250
                    </p>
                  </div>
                </div>

                {/* Context Preview */}
                <div className="flex flex-col grow rounded-lg bg-[#150b2e] border border-[#2e1a5e] overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#2e1a5e] bg-[#80f9ff]/5 flex justify-between items-center">
                    <h4 className="text-white font-bold text-sm tracking-widest uppercase">
                      Node_Context
                    </h4>
                    <span className="material-symbols-outlined text-[#80f9ff]/50 text-sm">
                      share
                    </span>
                  </div>

                  <div className="relative h-48 bg-black/60 w-full flex items-center justify-center overflow-hidden border-b border-[#2e1a5e]">
                    <div className="absolute inset-0 bg-[url('https://placeholder.pics/svg/400x300/150b2e/2e1a5e-80f9ff/Graph%20Visualization')] bg-cover opacity-60"></div>
                    {/* Overlay mock node */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="size-16 rounded-full border-2 border-[#80f9ff] bg-black/80 flex items-center justify-center shadow-[0_0_20px_rgba(128,249,255,0.4)] mb-2">
                        <span className="material-symbols-outlined text-[#80f9ff] text-3xl">
                          science
                        </span>
                      </div>
                      <div className="bg-black/80 px-3 py-1 rounded text-[#80f9ff] text-xs font-mono border border-[#80f9ff]/30">
                        ID: QUANT_MECH
                      </div>
                    </div>
                  </div>

                  <div className="p-4 flex flex-col gap-3">
                    <div>
                      <p className="text-[#80f9ff]/60 text-xs font-bold uppercase mb-1">
                        Parent Node
                      </p>
                      <div className="flex items-center gap-2 text-white text-sm">
                        <span className="material-symbols-outlined text-base">
                          arrow_upward
                        </span>
                        Physics_Standard_Model
                      </div>
                    </div>

                    <div className="h-px bg-[#2e1a5e] w-full"></div>

                    <div>
                      <p className="text-[#80f9ff]/60 text-xs font-bold uppercase mb-1">
                        Connected Nodes
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="px-2 py-1 rounded bg-[#2e1a5e]/50 text-slate-300 text-xs border border-[#2e1a5e] hover:border-[#80f9ff]/50 transition-colors cursor-default">
                          Wave_Function
                        </span>
                        <span className="px-2 py-1 rounded bg-[#2e1a5e]/50 text-slate-300 text-xs border border-[#2e1a5e] hover:border-[#80f9ff]/50 transition-colors cursor-default">
                          Schrödinger
                        </span>
                        <span className="px-2 py-1 rounded bg-[#2e1a5e]/50 text-slate-300 text-xs border border-[#2e1a5e] hover:border-[#80f9ff]/50 transition-colors cursor-default">
                          Planck_Constant
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto p-4 bg-black/20">
                    <button className="w-full py-2 rounded border border-[#80f9ff]/30 text-[#80f9ff] text-xs font-bold uppercase hover:bg-[#80f9ff] hover:text-black transition-all">
                      Explore Full Graph
                    </button>
                  </div>
                </div>

                {/* Mini Tools */}
                <div className="grid grid-cols-2 gap-3">
                  <button className="flex flex-col items-center justify-center gap-2 p-3 rounded bg-[#150b2e] border border-[#2e1a5e] hover:border-[#80f9ff]/50 group transition-all">
                    <span className="material-symbols-outlined text-white/50 group-hover:text-[#80f9ff] transition-colors">
                      lightbulb
                    </span>
                    <span className="text-xs text-white/50 font-bold uppercase group-hover:text-white">
                      Hint (-50XP)
                    </span>
                  </button>
                  <button className="flex flex-col items-center justify-center gap-2 p-3 rounded bg-[#150b2e] border border-[#2e1a5e] hover:border-[#80f9ff]/50 group transition-all">
                    <span className="material-symbols-outlined text-white/50 group-hover:text-[#80f9ff] transition-colors">
                      bookmark
                    </span>
                    <span className="text-xs text-white/50 font-bold uppercase group-hover:text-white">
                      Save for Later
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer / Status Line */}
        <footer className="border-t border-[#80f9ff]/10 bg-[#150b2e]/50 py-2 px-6 mt-auto">
          <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-widest text-[#80f9ff]/40">
            <span>System_Status: Operational</span>
            <span>Session_ID: 0x4F92A1</span>
            <span>Focus_Mode: ACTIVE</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default QuizScreen;
