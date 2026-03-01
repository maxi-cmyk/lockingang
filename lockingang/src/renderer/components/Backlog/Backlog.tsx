import React from "react";

export interface BacklogItemData {
  category: string;
  title: string;
  duration: string;
}

const BacklogItem: React.FC<{ item: BacklogItemData }> = ({ item }) => {
  return (
    <div className="group border border-white/10 p-4 hover:border-vector-blue transition-all duration-300 cursor-pointer bg-black/40 hover:bg-vector-blue/5 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-1">
        <span className="material-symbols-outlined text-[14px] text-vector-white/20 group-hover:text-vector-blue">
          drag_indicator
        </span>
      </div>

      <div className="flex justify-between items-center mb-2">
        <span className="text-[7px] text-vector-blue uppercase tracking-tighter font-mono border-b border-vector-blue/30 pb-0.5">
          {item.category}
        </span>
      </div>

      <h4 className="text-[10px] text-vector-white mb-2 leading-snug uppercase tracking-tight">
        {item.title}
      </h4>

      <div className="flex items-center justify-between border-t border-white/10 pt-2 mt-2">
        <div className="flex items-center gap-1 text-[8px] text-vector-white/60 font-mono">
          <span className="material-symbols-outlined text-[10px]">
            schedule
          </span>
          <span>{item.duration}</span>
        </div>
        <span className="material-symbols-outlined text-[14px] text-vector-blue opacity-0 group-hover:opacity-100 transition-opacity">
          arrow_back
        </span>
      </div>
    </div>
  );
};

const Backlog: React.FC = () => {
  const items: BacklogItemData[] = [
    { category: "RESEARCH", title: "Competitor Pricing", duration: "45m" },
    { category: "DEV", title: "OAuth Implementation", duration: "2h" },
    { category: "DESIGN", title: "Component Library", duration: "15m" },
    { category: "ADMIN", title: "Email Cleanup", duration: "30m" },
  ];

  return (
    <div className="w-80 flex-shrink-0 flex flex-col bg-vector-bg/40 border-l border-vector-blue/40 backdrop-blur-sm">
      <div className="p-6 border-b border-vector-blue/40 bg-vector-blue/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-vector-white text-[18px]">
              storage
            </span>
            <h3 className="text-[10px] uppercase tracking-widest text-vector-white">
              The_Backlog
            </h3>
          </div>
          <span className="border border-vector-blue text-vector-blue text-[9px] px-2 py-0.5 bg-vector-bg">
            12
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
        {items.map((item, index) => (
          <BacklogItem key={index} item={item} />
        ))}
      </div>

      <div className="p-4 border-t border-vector-blue/20">
        <button className="w-full border border-dashed border-vector-blue/40 py-2 text-[9px] text-vector-blue/60 hover:text-vector-blue hover:border-vector-blue hover:bg-vector-blue/10 transition-all uppercase tracking-widest flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[12px]">add</span>
          Quick_Entry
        </button>
      </div>
    </div>
  );
};

export default Backlog;
