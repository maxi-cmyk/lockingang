import React from "react";
import Sidebar from "../components/Sidebar/Sidebar";
import Header from "../components/Header/Header";
import FocusTunnel from "../components/FocusTunnel/FocusTunnel";
import Backlog from "../components/Backlog/Backlog";

const DashboardScreen: React.FC = () => {
  return (
    <div className="h-screen flex overflow-hidden bg-vector-bg text-vector-white font-terminal relative">
      <div className="scanline"></div>

      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0 bg-transparent relative z-10">
        <Header />

        <div className="flex-1 flex overflow-hidden">
          <FocusTunnel />
          <Backlog />
        </div>
      </main>
    </div>
  );
};

export default DashboardScreen;
