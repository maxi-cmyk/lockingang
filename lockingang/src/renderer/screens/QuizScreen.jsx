import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import { updateMastery, rescheduleNode, getNodeById, getState } from "../studyStore";

const PASS_THRESHOLD = 0.6; // score >= 60% = pass

const MasteryBar = ({ mastery }) => {
  const color = mastery >= 0.7 ? "#7DF9FF" : mastery >= 0.3 ? "#FFB800" : "#FF4444";
  const label = mastery >= 0.7 ? "MASTERED" : mastery >= 0.3 ? "IN PROGRESS" : "CRITICAL";
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[10px] font-mono tracking-widest uppercase" style={{ color }}>
          MASTERY: {Math.round(mastery * 100)}% — {label}
        </span>
      </div>
      <div className="h-2 bg-vector-white/5 w-full relative overflow-hidden">
        <div className="h-full transition-all duration-700"
          style={{ width: `${mastery * 100}%`, background: color, boxShadow: `0 0 8px ${color}60` }} />
      </div>
    </div>
  );
};

const QuizScreen = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const nodeId = searchParams.get("node") || "";

  // Resolve node info from studyStore
  const studyState = getState();
  const studyNode = studyState.nodes.find((n) => n.id === nodeId);
  const nodeLabel = studyNode?.label || nodeId;
  const nodeDesc = studyNode?.description || "";

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [questionIdx, setQuestionIdx] = useState(0);
  const [mastery, setMastery] = useState(studyNode?.mastery ?? 0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [wallDetected, setWallDetected] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [xp, setXp] = useState(0);
  const [rescheduled, setRescheduled] = useState(false);
  // Track each answer for the explanation screen
  const [answeredLog, setAnsweredLog] = useState([]); // [{question, selected, correct}]

  // ── Load AI questions ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        if (!window.api?.node?.quiz) {
          throw new Error("Quiz API not available. Is Electron running?");
        }
        const result = await window.api.node.quiz(nodeId, nodeLabel, nodeDesc);
        if (cancelled) return;
        const qs = result.questions || [];
        if (qs.length === 0) throw new Error("No questions returned.");
        setQuestions(qs);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err.message || "Failed to load quiz.");
        setQuestions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [nodeId, nodeLabel, nodeDesc]);

  // ── Answer a question ──────────────────────────────────────────────────────
  const handleAnswer = (letter) => {
    if (answered || questions.length === 0) return;
    const question = questions[questionIdx];
    setSelected(letter);
    setAnswered(true);
    const isCorrect = letter === question.correct;
    // Log this answer for the explanation screen
    setAnsweredLog((prev) => [...prev, { question, selected: letter, wasCorrect: isCorrect }]);
    if (isCorrect) {
      const newMastery = Math.min(1, mastery + (1 / questions.length) * 0.4);
      setMastery(newMastery);
      setCorrectCount((c) => c + 1);
      setXp((x) => x + 150);
    } else {
      const newMastery = Math.max(0, mastery - 0.05);
      setMastery(newMastery);
      const newWrong = wrongCount + 1;
      setWrongCount(newWrong);
      if (newMastery < 0.3 && newWrong >= 2 && !wallDetected) {
        setTimeout(() => setWallDetected(true), 600);
      }
    }
  };

  const handleNext = () => {
    if (questionIdx < questions.length - 1) {
      setQuestionIdx((i) => i + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      // Quiz complete — compute final score
      const totalCorrect = correctCount + (selected === questions[questionIdx].correct ? 1 : 0);
      const finalScore = totalCorrect / questions.length;
      const finalMastery = Math.max(0, Math.min(1, (studyNode?.mastery ?? 0) * 0.5 + finalScore * 0.5));

      updateMastery(nodeId, finalMastery);

      if (finalScore < PASS_THRESHOLD) {
        rescheduleNode(nodeId);
        setRescheduled(true);
      }
      setQuizComplete(true);
    }
  };

  const getOptionStyle = (letter) => {
    if (!answered) return { border: "rgba(125,249,255,0.2)", bg: "transparent", text: "rgba(255,255,255,0.7)", accent: "rgba(125,249,255,0.2)" };
    if (questions[questionIdx] && letter === questions[questionIdx].correct)
      return { border: "#4ade80", bg: "rgba(74,222,128,0.08)", text: "#4ade80", accent: "#4ade80" };
    if (letter === selected)
      return { border: "#FF4444", bg: "rgba(255,68,68,0.08)", text: "#FF4444", accent: "#FF4444" };
    return { border: "rgba(125,249,255,0.08)", bg: "transparent", text: "rgba(255,255,255,0.3)", accent: "rgba(125,249,255,0.08)" };
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-screen flex overflow-hidden bg-vector-bg text-vector-white font-terminal relative">
        <div className="scanline" />
        <Sidebar />
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <span className="material-symbols-outlined text-vector-blue text-[60px] animate-spin">refresh</span>
          <div className="text-center">
            <p className="text-[13px] text-vector-blue font-mono tracking-widest">GENERATING QUIZ</p>
            <p className="text-[11px] text-vector-white/40 font-mono mt-1">GPT-4o is building questions for: {nodeLabel}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (loadError || questions.length === 0) {
    return (
      <div className="h-screen flex overflow-hidden bg-vector-bg text-vector-white font-terminal relative">
        <div className="scanline" />
        <Sidebar />
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-12">
          <span className="material-symbols-outlined text-red-400 text-[60px]">error</span>
          <div className="text-center">
            <p className="text-red-400 font-mono tracking-widest text-[13px] uppercase">QUIZ LOAD FAILED</p>
            <p className="text-[11px] text-vector-white/50 font-mono mt-2 max-w-md">{loadError || "No questions generated."}</p>
            <p className="text-[10px] text-vector-white/30 font-mono mt-1">Check that the chatbot server is running (port 5001).</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => navigate(-1)}
              className="px-8 py-3 border border-vector-blue/40 text-vector-blue text-[11px] font-mono tracking-widest uppercase hover:bg-vector-blue/10 transition-all">
              GO BACK
            </button>
            <button onClick={() => window.location.reload()}
              className="px-8 py-3 bg-vector-blue text-vector-bg text-[11px] font-bold font-mono tracking-widest uppercase hover:brightness-110 transition-all">
              RETRY
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Complete state — performance + explanation screen ─────────────────────
  if (quizComplete) {
    const passedScore = mastery >= PASS_THRESHOLD;
    const wrongAnswers = answeredLog.filter((a) => !a.wasCorrect);
    const correctAnswers = answeredLog.filter((a) => a.wasCorrect);
    const scorePercent = Math.round((correctCount / questions.length) * 100);

    return (
      <div className="h-screen flex overflow-hidden bg-vector-bg text-vector-white font-terminal relative">
        <div className="scanline" />
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-14 border-b border-vector-blue flex items-center justify-between px-6 backdrop-blur-md bg-vector-bg/40 z-10 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-vector-white/60 font-mono tracking-wider">SESSION_COMPLETE</span>
              <span className="text-[13px] text-vector-blue font-bold">&gt;&gt;</span>
              <span className="text-[13px] text-vector-blue font-mono tracking-wider terminal-text">
                PERFORMANCE_REVIEW: [{nodeLabel.toUpperCase().replace(/ /g, "_")}]
              </span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6">
            <div className="max-w-4xl mx-auto flex flex-col gap-6">

              {/* Score banner */}
              <div className="border p-6 relative overflow-hidden"
                style={{ borderColor: passedScore ? "#7DF9FF50" : "#FF444450", background: passedScore ? "rgba(125,249,255,0.04)" : "rgba(255,68,68,0.04)" }}>
                <div className="absolute top-0 left-0 w-1.5 h-full" style={{ background: passedScore ? "#7DF9FF" : "#FF4444" }} />
                <div className="flex items-center gap-6 pl-2">
                  <span className="material-symbols-outlined text-[64px]" style={{ color: passedScore ? "#7DF9FF" : "#FF4444" }}>
                    {passedScore ? "military_tech" : "warning"}
                  </span>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold tracking-widest terminal-text" style={{ color: passedScore ? "#7DF9FF" : "#FF4444" }}>
                      {passedScore ? "SESSION COMPLETE" : "REVIEW REQUIRED"}
                    </h2>
                    <p className="text-[14px] text-vector-white/60 font-mono mt-1">{nodeLabel}</p>
                    <div className="flex gap-8 mt-3">
                      <div>
                        <p className="text-[12px] text-vector-white/40 font-mono uppercase">Score</p>
                        <p className="text-2xl font-bold font-mono" style={{ color: passedScore ? "#7DF9FF" : "#FF4444" }}>
                          {correctCount}/{questions.length} ({scorePercent}%)
                        </p>
                      </div>
                      <div>
                        <p className="text-[12px] text-vector-white/40 font-mono uppercase">Mastery</p>
                        <p className="text-2xl font-bold font-mono" style={{ color: passedScore ? "#7DF9FF" : "#FF4444" }}>
                          {Math.round(mastery * 100)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-[12px] text-vector-white/40 font-mono uppercase">XP</p>
                        <p className="text-2xl font-bold text-vector-blue font-mono">+{xp}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rescheduled notification */}
              {rescheduled && (
                <div className="border border-red-500/50 bg-red-500/5 p-4 flex items-center gap-3">
                  <span className="material-symbols-outlined text-red-400 text-xl">replay</span>
                  <div>
                    <p className="text-[13px] text-red-400 font-mono tracking-widest uppercase">Node Rescheduled</p>
                    <p className="text-[12px] text-vector-white/60 font-mono mt-0.5">
                      "{nodeLabel}" has been added back to your calendar for an extra review session.
                    </p>
                  </div>
                </div>
              )}

              {/* Correct answers summary */}
              {correctAnswers.length > 0 && (
                <div className="border border-green-500/20 bg-green-500/3">
                  <div className="px-4 py-3 border-b border-green-500/20 flex items-center gap-2">
                    <span className="material-symbols-outlined text-green-400 text-base">check_circle</span>
                    <span className="text-[13px] text-green-400 font-mono tracking-widest uppercase">
                      Correct ({correctAnswers.length})
                    </span>
                  </div>
                  <div className="divide-y divide-green-500/10">
                    {correctAnswers.map((a, i) => (
                      <div key={i} className="px-4 py-3 flex items-start gap-3">
                        <span className="material-symbols-outlined text-green-400 text-sm mt-0.5 shrink-0">check</span>
                        <p className="text-[13px] font-mono text-vector-white/70">{a.question.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Wrong answers with explanations */}
              {wrongAnswers.length > 0 && (
                <div className="border border-red-500/30 bg-red-500/3">
                  <div className="px-4 py-3 border-b border-red-500/20 flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-400 text-base">cancel</span>
                    <span className="text-[13px] text-red-400 font-mono tracking-widest uppercase">
                      Needs Review ({wrongAnswers.length})
                    </span>
                  </div>
                  <div className="divide-y divide-red-500/10">
                    {wrongAnswers.map((a, i) => {
                      const correctOpt = a.question.options?.find((o) => o.letter === a.question.correct);
                      const selectedOpt = a.question.options?.find((o) => o.letter === a.selected);
                      return (
                        <div key={i} className="px-4 py-4 flex flex-col gap-3">
                          {/* Question */}
                          <p className="text-[14px] font-mono text-vector-white/90 leading-relaxed">{a.question.text}</p>

                          {/* Your answer vs correct */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-start gap-2 p-2 border border-red-500/30 bg-red-500/5">
                              <span className="material-symbols-outlined text-red-400 text-sm shrink-0 mt-0.5">cancel</span>
                              <div>
                                <span className="text-[11px] text-red-400/70 font-mono uppercase tracking-widest block mb-0.5">Your answer</span>
                                <span className="text-[13px] font-mono text-red-400">{a.selected}. {selectedOpt?.text || a.selected}</span>
                              </div>
                            </div>
                            <div className="flex items-start gap-2 p-2 border border-green-500/30 bg-green-500/5">
                              <span className="material-symbols-outlined text-green-400 text-sm shrink-0 mt-0.5">check_circle</span>
                              <div>
                                <span className="text-[11px] text-green-400/70 font-mono uppercase tracking-widest block mb-0.5">Correct answer</span>
                                <span className="text-[13px] font-mono text-green-400">{a.question.correct}. {correctOpt?.text || a.question.correct}</span>
                              </div>
                            </div>
                          </div>

                          {/* Explanation */}
                          {a.question.explanation && (
                            <div className="border-l-2 border-vector-blue/40 pl-3">
                              <p className="text-[11px] text-vector-blue/60 font-mono uppercase tracking-widest mb-1">Explanation</p>
                              <p className="text-[13px] font-mono text-vector-white/70 leading-relaxed">{a.question.explanation}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-4 pb-4">
                <button
                  onClick={() => {
                    setQuestionIdx(0); setSelected(null); setAnswered(false);
                    setWrongCount(0); setCorrectCount(0); setWallDetected(false);
                    setQuizComplete(false); setRescheduled(false); setAnsweredLog([]);
                    setMastery(studyNode?.mastery ?? 0); setXp(0);
                    setLoading(true); setLoadError("");
                    window.api?.node?.quiz(nodeId, nodeLabel, nodeDesc)
                      .then((r) => { setQuestions(r.questions || []); setLoading(false); })
                      .catch((e) => { setLoadError(e.message); setLoading(false); });
                  }}
                  className="px-8 py-3 border border-vector-blue text-vector-blue text-[13px] font-mono tracking-widest uppercase hover:bg-vector-blue/10 transition-all">
                  RETRY
                </button>
                <button onClick={() => navigate("/knowledge-tree")}
                  className="flex-1 py-3 bg-vector-blue text-vector-bg text-[13px] font-bold font-mono tracking-widest uppercase hover:brightness-110 transition-all">
                  VIEW KNOWLEDGE TREE
                </button>
                <button onClick={() => navigate("/")}
                  className="px-8 py-3 border border-vector-white/20 text-vector-white/60 text-[13px] font-mono tracking-widest uppercase hover:bg-vector-white/5 transition-all">
                  DASHBOARD
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Active quiz ────────────────────────────────────────────────────────────
  const question = questions[questionIdx];

  return (
    <div className="h-screen flex overflow-hidden bg-vector-bg text-vector-white font-terminal relative">
      <div className="scanline" />
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-vector-blue flex items-center justify-between px-6 backdrop-blur-md bg-vector-bg/40 z-10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-vector-white/60 font-mono tracking-wider">SYSTEM_PROCESS</span>
            <span className="text-[12px] text-vector-blue font-bold">&gt;&gt;</span>
            <span className="text-[12px] text-vector-blue font-mono tracking-wider terminal-text">
              NODE_VALIDATION: [{nodeLabel.toUpperCase().replace(/ /g, "_")}]
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-vector-white/40 font-mono">Q {questionIdx + 1} / {questions.length}</span>
            <button onClick={() => navigate(-1)}
              className="flex items-center gap-2 border border-vector-blue/30 hover:border-vector-blue bg-vector-blue/10 hover:bg-vector-blue/20 text-vector-blue text-[11px] tracking-widest uppercase h-8 px-4 transition-all">
              EXIT_QUIZ <span className="material-symbols-outlined text-base">logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar py-6 px-6">
          <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">

            {/* Mastery bar */}
            <div className="p-4 border border-vector-blue/20 bg-vector-bg">
              <MasteryBar mastery={mastery} />
            </div>

            {/* Wall detection banner */}
            {wallDetected && (
              <div className="border-2 border-red-500 bg-red-500/10 p-4 relative overflow-hidden"
                style={{ boxShadow: "0 0 24px rgba(255,68,68,0.3)" }}>
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-red-400 text-2xl">warning</span>
                  <div>
                    <h3 className="text-red-400 font-bold text-[12px] tracking-widest uppercase terminal-text">
                      WALL_DETECTED — {nodeLabel}
                    </h3>
                    <p className="text-[11px] text-vector-white/70 font-mono mt-1">
                      Repeated failures detected. This node will be rescheduled for additional review.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Question */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                {/* Question card */}
                <div className="relative border border-vector-blue bg-vector-bg shadow-card-glow overflow-hidden">
                  <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-vector-blue" />
                  <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-vector-blue" />
                  <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-vector-blue" />
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-vector-blue" />

                  <div className="px-6 py-4 border-b border-vector-blue/20 flex justify-between items-center bg-vector-blue/5">
                    <h3 className="text-vector-blue font-bold tracking-widest text-[11px] flex items-center gap-2 uppercase">
                      <span className="material-symbols-outlined text-base">psychology</span>
                      NODE_QUERY_{String(questionIdx + 1).padStart(3, "0")} // {nodeLabel.toUpperCase().replace(/ /g, "_")}
                    </h3>
                  </div>

                  <div className="p-8">
                    <p className="text-vector-white text-sm font-mono leading-relaxed mb-6">{question.text}</p>
                    <div className="w-full h-28 bg-black/40 border border-vector-blue/10 overflow-hidden relative mb-2">
                      <div className="absolute inset-0 opacity-20"
                        style={{ backgroundImage: "radial-gradient(#7DF9FF 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                      <div className="text-vector-blue/50 font-mono text-[11px] p-4 z-10 relative leading-relaxed whitespace-pre">
                        {question.context || `> ANALYSING: ${nodeLabel.toUpperCase()}\n> LOADING CONTEXT...`}
                        {"\n"}<span className="animate-pulse">_</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Answer options */}
                <div className="grid grid-cols-1 gap-3">
                  {(question.options || []).map(({ letter, text }) => {
                    const s = getOptionStyle(letter);
                    return (
                      <button key={letter} onClick={() => handleAnswer(letter)} disabled={answered}
                        className="group relative flex items-center w-full p-4 bg-vector-bg border transition-all text-left"
                        style={{ borderColor: s.border, background: s.bg, cursor: answered ? "default" : "pointer" }}>
                        <div className="absolute left-0 top-0 bottom-0 w-1 transition-colors" style={{ background: s.accent }} />
                        <span className="flex items-center justify-center size-8 font-bold mr-4 transition-colors shrink-0 text-[11px]"
                          style={{ color: s.text, border: `1px solid ${s.accent}` }}>
                          {letter}
                        </span>
                        <span className="font-mono text-sm" style={{ color: s.text }}>{text}</span>
                        {answered && letter === question.correct && (
                          <span className="ml-auto shrink-0 material-symbols-outlined text-green-400 text-base">check_circle</span>
                        )}
                        {answered && letter === selected && selected !== question.correct && (
                          <span className="ml-auto shrink-0 material-symbols-outlined text-red-400 text-base">cancel</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {answered && (
                  <button onClick={handleNext}
                    className="w-full py-3 bg-vector-blue text-vector-bg text-[11px] font-bold uppercase tracking-widest font-mono hover:brightness-110 transition-all flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    {questionIdx < questions.length - 1 ? "NEXT QUESTION" : "COMPLETE SESSION"}
                  </button>
                )}
              </div>

              {/* Right: Stats */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1 p-4 bg-vector-bg border border-vector-blue/30 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 text-vector-blue/5 group-hover:text-vector-blue/10 transition-colors">
                      <span className="material-symbols-outlined text-[80px]">local_fire_department</span>
                    </div>
                    <p className="text-vector-blue/70 text-[10px] font-bold tracking-widest uppercase z-10">XP Earned</p>
                    <p className="text-vector-blue text-3xl font-bold leading-tight z-10 font-mono">+{xp}</p>
                  </div>
                  <div className="flex flex-col gap-1 p-4 bg-vector-bg border border-red-500/30 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 text-red-500/5 group-hover:text-red-500/10 transition-colors">
                      <span className="material-symbols-outlined text-[80px]">warning</span>
                    </div>
                    <p className="text-red-400/70 text-[10px] font-bold tracking-widest uppercase z-10">Mistakes</p>
                    <p className="text-red-400 text-3xl font-bold leading-tight z-10 font-mono">{wrongCount}</p>
                  </div>
                </div>

                {/* Node context */}
                <div className="flex flex-col grow bg-vector-bg border border-vector-blue/20 overflow-hidden">
                  <div className="px-4 py-3 border-b border-vector-blue/20 bg-vector-blue/5">
                    <h4 className="text-vector-white font-bold text-[11px] tracking-widest uppercase">Node_Context</h4>
                  </div>
                  <div className="relative h-32 bg-black/60 w-full flex items-center justify-center overflow-hidden border-b border-vector-blue/20">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(#7DF9FF 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="size-14 border-2 flex items-center justify-center mb-2"
                        style={{
                          borderColor: mastery >= 0.7 ? "#7DF9FF" : mastery >= 0.3 ? "#FFB800" : "#FF4444",
                          boxShadow: `0 0 16px ${mastery >= 0.7 ? "rgba(125,249,255,0.4)" : mastery >= 0.3 ? "rgba(255,184,0,0.3)" : "rgba(255,68,68,0.4)"}`
                        }}>
                        <span className="material-symbols-outlined text-2xl"
                          style={{ color: mastery >= 0.7 ? "#7DF9FF" : mastery >= 0.3 ? "#FFB800" : "#FF4444" }}>
                          blur_on
                        </span>
                      </div>
                      <div className="px-3 py-1 text-[11px] font-mono border"
                        style={{
                          color: mastery >= 0.7 ? "#7DF9FF" : mastery >= 0.3 ? "#FFB800" : "#FF4444",
                          borderColor: mastery >= 0.7 ? "#7DF9FF40" : mastery >= 0.3 ? "#FFB80040" : "#FF444440"
                        }}>
                        MASTERY: {Math.round(mastery * 100)}%
                      </div>
                    </div>
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                    {nodeDesc && (
                      <p className="text-[11px] font-mono text-vector-white/50 leading-relaxed">{nodeDesc}</p>
                    )}
                    <div className="mt-auto">
                      <button onClick={() => navigate("/knowledge-tree")}
                        className="w-full py-2 border border-vector-blue/30 text-vector-blue text-[11px] font-bold uppercase tracking-widest hover:bg-vector-blue hover:text-vector-bg transition-all">
                        EXPLORE GRAPH
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="border-t border-vector-blue/20 bg-vector-bg py-2 px-6 shrink-0">
          <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-widest text-vector-blue/40">
            <span>System_Status: OPERATIONAL</span>
            <span>Node: {nodeId} · Wrong: {wrongCount} · Mastery: {Math.round(mastery * 100)}%</span>
            <span>Focus_Mode: ACTIVE</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default QuizScreen;
