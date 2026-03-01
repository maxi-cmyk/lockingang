import React from "react";
import { NavLink } from "react-router-dom";

const Sidebar = () => {
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
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 border transition-all group ${isActive
                ? "border-[#7DF9FF] bg-[#7DF9FF]/10 text-white"
                : "border-transparent text-white/60 hover:text-[#7DF9FF] hover:border-[#7DF9FF]/30"
              }`
            }
          >
            <span
              className={`material-symbols-outlined text-[18px] ${location.pathname === "/" ? "text-[#7DF9FF]" : ""
                }`}
            >
              dashboard
            </span>
            <span className="text-[9px] tracking-widest uppercase">
              Dashboard
            </span>
          </NavLink>
          <NavLink
            to="/knowledge-tree"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 border transition-all group ${isActive
                ? "border-[#7DF9FF] bg-[#7DF9FF]/10 text-white"
                : "border-transparent text-white/60 hover:text-[#7DF9FF] hover:border-[#7DF9FF]/30"
              }`
            }
          >
            <span className="material-symbols-outlined text-[18px]">
              account_tree
            </span>
            <span className="text-[9px] tracking-widest uppercase">
              Knowledge Tree
            </span>
          </NavLink>
          <NavLink
            to="/chatbot"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 border transition-all group ${isActive
                ? "border-[#7DF9FF] bg-[#7DF9FF]/10 text-white"
                : "border-transparent text-white/60 hover:text-[#7DF9FF] hover:border-[#7DF9FF]/30"
              }`
            }
          >
            <span className="material-symbols-outlined text-[18px]">chat</span>
            <span className="text-[9px] tracking-widest uppercase">
              Chatbot
            </span>
          </NavLink>
          <NavLink
            to="/templates"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 border transition-all group ${isActive
                ? "border-[#7DF9FF] bg-[#7DF9FF]/10 text-white"
                : "border-transparent text-white/60 hover:text-[#7DF9FF] hover:border-[#7DF9FF]/30"
              }`
            }
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            <span className="text-[9px] tracking-widest uppercase">Templates</span>
          </NavLink>
          <NavLink
            to="/calendar"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 border transition-all group ${isActive
                ? "border-[#7DF9FF] bg-[#7DF9FF]/10 text-white"
                : "border-transparent text-white/60 hover:text-[#7DF9FF] hover:border-[#7DF9FF]/30"
              }`
            }
          >
            <span className="material-symbols-outlined text-[18px]">
              calendar_month
            </span>
            <span className="text-[9px] tracking-widest uppercase">
              Calendar & Schedule
            </span>
          </NavLink>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
