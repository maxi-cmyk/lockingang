import React from "react";
import ReactDOM from "react-dom/client";
import DashboardScreen from "./screens/DashboardScreen";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <DashboardScreen />
  </React.StrictMode>,
);
