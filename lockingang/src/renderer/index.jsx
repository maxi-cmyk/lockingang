import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import ChatbotScreen from "./screens/ChatbotScreen";
import DashboardScreen from "./screens/DashboardScreen";
import VectorGraphScreen from "./screens/VectorGraphScreen";
import QuizScreen from "./screens/QuizScreen";
import TemplateScreen from "./screens/TemplateScreen";
import "./styles/global.css";
import NotFoundScreen from "./screens/NotFoundScreen";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<DashboardScreen />} />
        <Route path="/chatbot" element={<ChatbotScreen />} />
        <Route path="/knowledge-tree" element={<VectorGraphScreen />} />
        <Route path="/quiz" element={<QuizScreen />} />
        <Route path="/focus-tunnel" element={<NotFoundScreen />} />
        <Route path="/templates" element={<TemplateScreen />} />
        <Route path="/calendar" element={<NotFoundScreen />} />
        <Route path="*" element={<NotFoundScreen />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
