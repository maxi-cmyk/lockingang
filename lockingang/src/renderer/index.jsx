import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import ChatbotScreen from "./screens/ChatbotScreen";
import DashboardScreen from "./screens/DashboardScreen";
import KnowledgeTreeScreen from "./screens/KnowledgeTreeScreen";
import QuizScreen from "./screens/QuizScreen";
import TemplateScreen from "./screens/TemplateScreen";
import CalendarScreen from "./screens/CalendarScreen";
import "./styles/global.css";
import NotFoundScreen from "./screens/NotFoundScreen";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<DashboardScreen />} />
        <Route path="/chatbot" element={<ChatbotScreen />} />
        <Route path="/knowledge-tree" element={<KnowledgeTreeScreen />} />
        <Route path="/quiz" element={<QuizScreen />} />
        <Route path="/templates" element={<TemplateScreen />} />
        <Route path="/calendar" element={<CalendarScreen />} />
        <Route path="*" element={<NotFoundScreen />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
