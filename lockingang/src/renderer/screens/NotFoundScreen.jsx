import React from "react";
import Sidebar from "../components/Sidebar/Sidebar";

const NotFoundScreen = () => {
    return (
        <div className="h-screen flex overflow-hidden bg-vector-bg text-vector-white font-terminal relative">
            <div className="scanline"></div>
            <Sidebar />
            <main className="flex-1 flex flex-col items-center justify-center gap-6">
                <div className="text-vector-blue text-[48px] terminal-text">404</div>
                <p className="text-[12px] tracking-widest uppercase text-vector-white/60">
                    PAGE_NOT_IMPLEMENTED
                </p>
                <p className="text-[10px] tracking-widest text-vector-blue/40 font-mono animate-pulse">
          /// ROUTE_UNAVAILABLE ///
                </p>
            </main>
        </div>
    );
};

export default NotFoundScreen;
