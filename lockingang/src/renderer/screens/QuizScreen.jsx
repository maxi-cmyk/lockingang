import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";

const QUIZ_DATA = {
  COMMON_DIST: {
    nodeLabel: "Common Distributions",
    parentNode: "Expectation & Variance",
    connectedNodes: ["Normal Distribution", "Binomial Distribution", "Poisson Distribution"],
    icon: "bar_chart",
    initialMastery: 0.20,
    questions: [
      {
        id: "q1",
        text: "Which distribution models the probability of exactly k successes in n independent Bernoulli trials?",
        context: "> CONTEXT: Each trial has probability p of success.\n> EVENTS ARE INDEPENDENT.\n> CALCULATING P(X = k)...",
        options: [
          { letter: "A", text: "Binomial Distribution — B(n, p)" },
          { letter: "B", text: "Poisson Distribution — Po(λ)" },
          { letter: "C", text: "Normal Distribution — N(μ, σ²)" },
          { letter: "D", text: "Uniform Distribution — U(a, b)" },
        ],
        correct: "A",
      },
      {
        id: "q2",
        text: "The Normal distribution N(μ, σ²) is fully characterised by which two parameters?",
        context: "> BELL CURVE ANALYSIS...\n> SYMMETRIC ABOUT MEAN.\n> 68-95-99.7 RULE APPLIES.\n> IDENTIFYING PARAMETERS...",
        options: [
          { letter: "A", text: "Mean (μ) and variance (σ²)" },
          { letter: "B", text: "Number of trials n and probability p" },
          { letter: "C", text: "Rate parameter λ only" },
          { letter: "D", text: "Median and interquartile range" },
        ],
        correct: "A",
      },
      {
        id: "q3",
        text: "For a Poisson distribution Po(λ), what does the parameter λ represent?",
        context: "> MODELLING RARE EVENTS...\n> EVENTS OCCUR INDEPENDENTLY.\n> CONSTANT RATE IN FIXED INTERVAL.\n> PARAMETER ANALYSIS...",
        options: [
          { letter: "A", text: "The probability of a single event occurring" },
          { letter: "B", text: "The average number of events in the given interval" },
          { letter: "C", text: "The standard deviation of the distribution" },
          { letter: "D", text: "The maximum number of possible events" },
        ],
        correct: "B",
      },
    ],
  },
};

const DEFAULT_NODE = "COMMON_DIST";

const MasteryBar = ({ mastery }) => {
  const color = mastery >= 0.7 ? "#7DF9FF" : mastery >= 0.3 ? "#FFB800" : "#FF4444";
  const label = mastery >= 0.7 ? "MASTERED" : mastery >= 0.3 ? "IN PROGRESS" : "CRITICAL";
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[8px] font-mono tracking-widest uppercase" style={{ color }}>
          MASTERY: {Math.round(mastery * 100)}% — {label}
        </span>
      </div>
      <div className="h-2 bg-vector-white/5 w-full relative overflow-hidden">
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${mastery * 100}%`, background: color, boxShadow: `0 0 8px ${color}60` }}
        />
      </div>
    </div>
  );
};

const QuizScreen = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const nodeId = searchParams.get("node") || DEFAULT_NODE;
  const quiz = QUIZ_DATA[nodeId] || QUIZ_DATA[DEFAULT_NODE];

  const [questionIdx, setQuestionIdx] = useState(0);
  const [mastery, setMastery] = useState(quiz.initialMastery);
  const [selected, setSelected] = useState(null);       // letter chosen this question
  const [answered, setAnswered] = useState(false);
  const [wrongCount, setWrongCount] = useState(0);
  const [wallDetected, setWallDetected] = useState(false);
  const [bridgeCreated, setBridgeCreated] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);
  const [xp, setXp] = useState(0);

  const question = quiz.questions[questionIdx];

  const handleAnswer = (letter) => {
    if (answered) return;
    setSelected(letter);
    setAnswered(true);

    const isCorrect = letter === question.correct;
    if (isCorrect) {
      const newMastery = Math.min(1, mastery + 0.15);
      setMastery(newMastery);
      setXp((x) => x + 150);
    } else {
      const newMastery = Math.max(0, mastery - 0.08);
      setMastery(newMastery);
      const newWrong = wrongCount + 1;
      setWrongCount(newWrong);
      if (newMastery < 0.3 && newWrong >= 2 && !wallDetected) {
        setTimeout(() => {
          setWallDetected(true);
          setTimeout(() => setBridgeCreated(true), 1800);
        }, 600);
      }
    }
  };

  const handleNext = () => {
    if (questionIdx < quiz.questions.length - 1) {
      setQuestionIdx((i) => i + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setQuizComplete(true);
    }
  };

  const getOptionStyle = (letter) => {
    if (!answered) return { border: "rgba(125,249,255,0.2)", bg: "transparent", text: "rgba(255,255,255,0.7)", accent: "rgba(125,249,255,0.2)" };
    if (letter === question.correct) return { border: "#4ade80", bg: "rgba(74,222,128,0.08)", text: "#4ade80", accent: "#4ade80" };
    if (letter === selected && selected !== question.correct) return { border: "#FF4444", bg: "rgba(255,68,68,0.08)", text: "#FF4444", accent: "#FF4444" };
    return { border: "rgba(125,249,255,0.08)", bg: "transparent", text: "rgba(255,255,255,0.3)", accent: "rgba(125,249,255,0.08)" };
  };

  if (quizComplete) {
    return (
      <div className="h-screen flex overflow-hidden bg-vector-bg text-vector-white font-terminal relative">
        <div className="scanline" />
        <Sidebar />
        <div className="flex-1 flex flex-col items-center justify-center gap-8 p-12">
          <span className="material-symbols-outlined text-[80px]" style={{ color: mastery >= 0.5 ? "#7DF9FF" : "#FF4444" }}>
            {mastery >= 0.5 ? "military_tech" : "warning"}
          </span>
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-widest terminal-text" style={{ color: mastery >= 0.5 ? "#7DF9FF" : "#FF4444" }}>
              {mastery >= 0.5 ? "SESSION COMPLETE" : "REVIEW REQUIRED"}
            </h2>
            <p className="text-[10px] text-vector-white/50 font-mono mt-2">Common Distributions · {quiz.questions.length} questions</p>
          </div>
          <div className="flex gap-12">
            <div className="text-center"><p className="text-[8px] text-vector-white/40 font-mono uppercase">Final Mastery</p><p className="text-3xl font-bold font-mono" style={{ color: mastery >= 0.5 ? "#7DF9FF" : "#FF4444" }}>{Math.round(mastery * 100)}%</p></div>
            <div className="text-center"><p className="text-[8px] text-vector-white/40 font-mono uppercase">XP Earned</p><p className="text-3xl font-bold text-vector-blue font-mono">+{xp}</p></div>
            <div className="text-center"><p className="text-[8px] text-vector-white/40 font-mono uppercase">Wrong Answers</p><p className="text-3xl font-bold font-mono text-red-400">{wrongCount}</p></div>
          </div>
          {bridgeCreated && (
            <div className="border border-vector-blue/50 bg-vector-blue/5 p-4 max-w-lg text-center">
              <p className="text-[9px] text-vector-blue font-mono tracking-widest uppercase">Bridge Node Active</p>
              <p className="text-[8px] text-vector-white/60 font-mono mt-1">
                "Bridge: Expectation & Variance → Common Distributions" has been added to your knowledge tree.
              </p>
            </div>
          )}
          <div className="flex gap-4">
            <button onClick={() => { setQuestionIdx(0); setSelected(null); setAnswered(false); setWrongCount(0); setWallDetected(false); setBridgeCreated(false); setQuizComplete(false); setMastery(quiz.initialMastery); setXp(0); }}
              className="px-8 py-3 border border-vector-blue text-vector-blue text-[9px] font-mono tracking-widest uppercase hover:bg-vector-blue/10 transition-all">
              RETRY
            </button>
            <button onClick={() => navigate("/knowledge-tree")}
              className="px-8 py-3 bg-vector-blue text-vector-bg text-[9px] font-bold font-mono tracking-widest uppercase hover:brightness-110 transition-all">
              VIEW KNOWLEDGE TREE
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-vector-bg text-vector-white font-terminal relative">
      <div className="scanline" />
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">


        <main className="flex-1 overflow-y-auto custom-scrollbar py-6 px-6">
          <div className="w-full max-w-6xl mx-auto flex flex-col gap-6">

            {/* Mastery bar */}
            <div className="p-4 border border-vector-blue/20 bg-vector-bg">
              <MasteryBar mastery={mastery} />
            </div>

            {/* Wall Detection Banner */}
            {wallDetected && (
              <div
                className="border-2 border-red-500 bg-red-500/10 p-4 relative overflow-hidden"
                style={{ boxShadow: "0 0 24px rgba(255,68,68,0.3)", animation: "fadeIn 0.5s ease" }}
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-red-400 text-2xl">warning</span>
                  <div>
                    <h3 className="text-red-400 font-bold text-[10px] tracking-widest uppercase terminal-text">
                      ⚡ WALL_DETECTED — Common Distributions
                    </h3>
                    <p className="text-[9px] text-vector-white/70 font-mono mt-1">
                      Repeated failures detected while <span className="text-vector-blue">Expectation & Variance</span> is mastered (0.82).
                      This is a structural gap in your knowledge.
                    </p>
                    {bridgeCreated && (
                      <div className="mt-2 flex items-center gap-2 text-vector-blue text-[9px] font-mono">
                        <span className="material-symbols-outlined text-sm text-green-400">add_circle</span>
                        <span className="text-green-400">BRIDGE NODE GENERATED:</span>
                        <span className="text-vector-white/70">"Bridge: Expectation & Variance → Common Distributions"</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Bridge node notification */}
            {bridgeCreated && (
              <div className="border border-green-500/50 bg-green-500/5 p-4 flex items-center gap-3"
                style={{ animation: "fadeIn 0.5s ease" }}>
                <span className="material-symbols-outlined text-green-400 text-xl">account_tree</span>
                <div>
                  <p className="text-[9px] text-green-400 font-mono tracking-widest uppercase">Bridge Node Added to Knowledge Tree</p>
                  <p className="text-[8px] text-vector-white/50 font-mono mt-0.5">
                    lockingang generated introductory content connecting Expectation & Variance → Common Distributions.
                    Review this node first to close the gap.
                  </p>
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
                    <h3 className="text-vector-blue font-bold tracking-widest text-[9px] flex items-center gap-2 uppercase">
                      <span className="material-symbols-outlined text-base">psychology</span>
                      NODE_QUERY_{String(questionIdx + 1).padStart(3, "0")} // {quiz.nodeLabel.toUpperCase().replace(/ /g, "_")}
                    </h3>
                  </div>

                  <div className="p-8">
                    <p className="text-vector-white text-sm font-mono leading-relaxed mb-6">
                      {question.text}
                    </p>
                    <div className="w-full h-28 bg-black/40 border border-vector-blue/10 overflow-hidden relative mb-2">
                      <div className="absolute inset-0 opacity-20"
                        style={{ backgroundImage: "radial-gradient(#7DF9FF 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                      <div className="text-vector-blue/50 font-mono text-[9px] p-4 z-10 relative leading-relaxed whitespace-pre">
                        {question.context}
                        {"\n"}<span className="animate-pulse">_</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Answer options */}
                <div className="grid grid-cols-1 gap-3">
                  {question.options.map(({ letter, text }) => {
                    const s = getOptionStyle(letter);
                    return (
                      <button
                        key={letter}
                        onClick={() => handleAnswer(letter)}
                        disabled={answered}
                        className="group relative flex items-center w-full p-4 bg-vector-bg border transition-all text-left"
                        style={{ borderColor: s.border, background: s.bg, cursor: answered ? "default" : "pointer" }}
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 transition-colors" style={{ background: s.accent }} />
                        <span
                          className="flex items-center justify-center size-8 font-bold mr-4 transition-colors shrink-0 text-[9px]"
                          style={{ background: answered ? s.bg : undefined, color: s.text, border: `1px solid ${s.accent}` }}
                        >
                          {letter}
                        </span>
                        <span className="font-mono text-xs" style={{ color: s.text }}>{text}</span>
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

                {/* Next button */}
                {answered && (
                  <button
                    onClick={handleNext}
                    className="w-full py-3 bg-vector-blue text-vector-bg text-[9px] font-bold uppercase tracking-widest font-mono hover:brightness-110 transition-all flex items-center justify-center gap-2"
                    style={{ animation: "fadeIn 0.3s ease" }}
                  >
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    {questionIdx < quiz.questions.length - 1 ? "NEXT QUESTION" : "COMPLETE SESSION"}
                  </button>
                )}
              </div>

              {/* Right: Stats & Context */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1 p-4 bg-vector-bg border border-vector-blue/30 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 text-vector-blue/5 group-hover:text-vector-blue/10 transition-colors">
                      <span className="material-symbols-outlined text-[80px]">local_fire_department</span>
                    </div>
                    <p className="text-vector-blue/70 text-[8px] font-bold tracking-widest uppercase z-10">XP Earned</p>
                    <p className="text-vector-blue text-3xl font-bold leading-tight z-10 font-mono">+{xp}</p>
                  </div>
                  <div className="flex flex-col gap-1 p-4 bg-vector-bg border border-red-500/30 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 text-red-500/5 group-hover:text-red-500/10 transition-colors">
                      <span className="material-symbols-outlined text-[80px]">warning</span>
                    </div>
                    <p className="text-red-400/70 text-[8px] font-bold tracking-widest uppercase z-10">Mistakes</p>
                    <p className="text-red-400 text-3xl font-bold leading-tight z-10 font-mono">{wrongCount}</p>
                  </div>
                </div>

                {/* Node context */}
                <div className="flex flex-col grow bg-vector-bg border border-vector-blue/20 overflow-hidden">
                  <div className="px-4 py-3 border-b border-vector-blue/20 bg-vector-blue/5 flex justify-between items-center">
                    <h4 className="text-vector-white font-bold text-[9px] tracking-widest uppercase">Node_Context</h4>
                  </div>
                  <div className="relative h-32 bg-black/60 w-full flex items-center justify-center overflow-hidden border-b border-vector-blue/20">
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(#7DF9FF 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                    <div className="relative z-10 flex flex-col items-center">
                      <div className="size-14 border-2 border-red-500 bg-black/80 flex items-center justify-center mb-2"
                        style={{ boxShadow: "0 0 16px rgba(255,68,68,0.4)" }}>
                        <span className="material-symbols-outlined text-red-400 text-2xl">{quiz.icon}</span>
                      </div>
                      <div className="bg-black/80 px-3 py-1 text-red-400 text-[9px] font-mono border border-red-500/30">
                        MASTERY: {Math.round(mastery * 100)}% — CRITICAL
                      </div>
                    </div>
                  </div>
                  <div className="p-4 flex flex-col gap-3">
                    <div>
                      <p className="text-vector-blue/60 text-[8px] font-bold uppercase tracking-widest mb-1">Parent Node</p>
                      <div className="flex items-center gap-2 text-vector-white text-xs font-mono">
                        <span className="material-symbols-outlined text-base text-vector-blue">arrow_upward</span>
                        {quiz.parentNode}
                      </div>
                    </div>
                    <div className="h-px bg-vector-blue/20 w-full" />
                    <div>
                      <p className="text-vector-blue/60 text-[8px] font-bold uppercase tracking-widest mb-2">Sub-Topics</p>
                      <div className="flex flex-wrap gap-1.5">
                        {quiz.connectedNodes.map((tag) => (
                          <span key={tag} className="px-2 py-0.5 bg-vector-blue/5 text-vector-white/60 text-[8px] border border-vector-blue/20 font-mono">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto p-4 bg-black/20">
                    <button onClick={() => navigate("/knowledge-tree")}
                      className="w-full py-2 border border-vector-blue/30 text-vector-blue text-[9px] font-bold uppercase tracking-widest hover:bg-vector-blue hover:text-vector-bg transition-all">
                      EXPLORE FULL GRAPH
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="border-t border-vector-blue/20 bg-vector-bg py-2 px-6 shrink-0">
          <div className="flex justify-between items-center text-[8px] uppercase font-mono tracking-widest text-vector-blue/40">
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
