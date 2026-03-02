import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import styles from "./QuizScreen.module.css";

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
      <div className={styles.masteryContainer}>
        <span className={styles.masteryText} style={{ color }}>
          MASTERY: {Math.round(mastery * 100)}% — {label}
        </span>
      </div>
      <div className={styles.barBackground}>
        <div
          className={styles.barFill}
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
    if (!answered) return { border: "rgba(125,249,255,0.2)", bg: "#0d0221", text: "rgba(255,255,255,0.7)", accent: "rgba(125,249,255,0.2)" };
    if (letter === question.correct) return { border: "#4ade80", bg: "rgba(74,222,128,0.08)", text: "#4ade80", accent: "#4ade80" };
    if (letter === selected && selected !== question.correct) return { border: "#FF4444", bg: "rgba(255,68,68,0.08)", text: "#FF4444", accent: "#FF4444" };
    return { border: "rgba(125,249,255,0.08)", bg: "#0d0221", text: "rgba(255,255,255,0.3)", accent: "rgba(125,249,255,0.08)" };
  };

  if (quizComplete) {
    return (
      <div className={styles.container}>
        <div className={styles.scanline} />
        <Sidebar />
        <div className={styles.mainCompletionArea}>
          <span className={`material-symbols-outlined text-[80px]`} style={{ color: mastery >= 0.5 ? "#7DF9FF" : "#FF4444" }}>
            {mastery >= 0.5 ? "military_tech" : "warning"}
          </span>
          <div className={styles.completionTitleWrapper}>
            <h2 className={styles.completionTitle} style={{ color: mastery >= 0.5 ? "#7DF9FF" : "#FF4444" }}>
              {mastery >= 0.5 ? "SESSION COMPLETE" : "REVIEW REQUIRED"}
            </h2>
            <p className={styles.completionSubtitle}>Common Distributions · {quiz.questions.length} questions</p>
          </div>
          <div className={styles.statsRow}>
            <div className={styles.statBox}>
              <p className={styles.statLabel}>Final Mastery</p>
              <p className={styles.statValue} style={{ color: mastery >= 0.5 ? "#7DF9FF" : "#FF4444" }}>{Math.round(mastery * 100)}%</p>
            </div>
            <div className={styles.statBox}>
              <p className={styles.statLabel}>XP Earned</p>
              <p className={`${styles.statValue} text-vector-blue`}>+{xp}</p>
            </div>
            <div className={styles.statBox}>
              <p className={styles.statLabel}>Wrong Answers</p>
              <p className={`${styles.statValue} text-red-400`}>{wrongCount}</p>
            </div>
          </div>
          {bridgeCreated && (
            <div className={styles.bridgeInfoBox}>
              <p className={styles.bridgeInfoTitle}>Bridge Node Active</p>
              <p className={styles.bridgeInfoDesc}>
                "Bridge: Expectation & Variance → Common Distributions" has been added to your knowledge tree.
              </p>
            </div>
          )}
          <div className={styles.actionButtons}>
            <button onClick={() => { setQuestionIdx(0); setSelected(null); setAnswered(false); setWrongCount(0); setWallDetected(false); setBridgeCreated(false); setQuizComplete(false); setMastery(quiz.initialMastery); setXp(0); }}
              className={styles.retryBtn}>
              RETRY
            </button>
            <button onClick={() => navigate("/knowledge-tree")}
              className={styles.treeBtn}>
              VIEW KNOWLEDGE TREE
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.scanline} />
      <Sidebar />

      <div className={styles.contentArea}>


        <main className={`${styles.scrollArea} custom-scrollbar`}>
          <div className={styles.centerWrapper}>

            {/* Mastery bar */}
            <div className={styles.masteryPanel}>
              <MasteryBar mastery={mastery} />
            </div>

            {/* Wall Detection Banner */}
            {wallDetected && (
              <div className={styles.wallBanner}>
                <div className={styles.wallBannerLine} />
                <div className={styles.wallBannerContent}>
                  <span className={`material-symbols-outlined text-red-400 text-2xl`}>warning</span>
                  <div>
                    <h3 className={styles.wallBannerTitle}>
                      ⚡ WALL_DETECTED — Common Distributions
                    </h3>
                    <p className={styles.wallBannerDesc}>
                      Repeated failures detected while <span className="text-vector-blue">Expectation & Variance</span> is mastered (0.82).
                      This is a structural gap in your knowledge.
                    </p>
                    {bridgeCreated && (
                      <div className={styles.bridgeGenRow}>
                        <span className={`material-symbols-outlined text-sm text-green-400`}>add_circle</span>
                        <span className={styles.bridgeGenLabel}>BRIDGE NODE GENERATED:</span>
                        <span className={styles.bridgeGenDesc}>"Bridge: Expectation & Variance → Common Distributions"</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Bridge node notification */}
            {bridgeCreated && (
              <div className={styles.bridgeNotifyBanner}>
                <span className={`material-symbols-outlined text-green-400 text-xl`}>account_tree</span>
                <div>
                  <p className={styles.bridgeNotifyTitle}>Bridge Node Added to Knowledge Tree</p>
                  <p className={styles.bridgeNotifyDesc}>
                    lockingang generated introductory content connecting Expectation & Variance → Common Distributions.
                    Review this node first to close the gap.
                  </p>
                </div>
              </div>
            )}

            <div className={styles.mainGrid}>
              {/* Left: Question */}
              <div className={styles.leftCol}>
                {/* Question card */}
                <div className={styles.questionCard}>
                  <div className={styles.cornerTL} />
                  <div className={styles.cornerTR} />
                  <div className={styles.cornerBL} />
                  <div className={styles.cornerBR} />

                  <div className={styles.questionHeader}>
                    <h3 className={styles.questionTitle}>
                      <span className={`material-symbols-outlined text-base`}>psychology</span>
                      NODE_QUERY_{String(questionIdx + 1).padStart(3, "0")} // {quiz.nodeLabel.toUpperCase().replace(/ /g, "_")}
                    </h3>
                  </div>

                  <div className={styles.questionBody}>
                    <p className={styles.questionText}>
                      {question.text}
                    </p>
                    <div className={styles.contextArea}>
                      <div className={styles.contextBg} />
                      <div className={styles.contextText}>
                        {question.context}
                        {"\n"}<span className="animate-pulse">_</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Answer options */}
                <div className={styles.optionsGrid}>
                  {question.options.map(({ letter, text }) => {
                    const s = getOptionStyle(letter);
                    return (
                      <button
                        key={letter}
                        onClick={() => handleAnswer(letter)}
                        disabled={answered}
                        className={`${styles.optionBtn} group`}
                        style={{ borderColor: s.border, backgroundColor: s.bg, cursor: answered ? "default" : "pointer" }}
                      >
                        <div className={styles.optionAccentBar} style={{ backgroundColor: s.accent }} />
                        <span
                          className={styles.optionLetter}
                          style={{ backgroundColor: answered ? s.bg : "transparent", color: s.text, border: `1px solid ${s.accent}` }}
                        >
                          {letter}
                        </span>
                        <span className={styles.optionText} style={{ color: s.text }}>{text}</span>
                        {answered && letter === question.correct && (
                          <span className={`ml-auto shrink-0 material-symbols-outlined text-green-400 text-base`}>check_circle</span>
                        )}
                        {answered && letter === selected && selected !== question.correct && (
                          <span className={`ml-auto shrink-0 material-symbols-outlined text-red-400 text-base`}>cancel</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Next button */}
                {answered && (
                  <button
                    onClick={handleNext}
                    className={styles.nextBtn}
                  >
                    <span className={`material-symbols-outlined text-sm`}>arrow_forward</span>
                    {questionIdx < quiz.questions.length - 1 ? "NEXT QUESTION" : "COMPLETE SESSION"}
                  </button>
                )}
              </div>

              {/* Right: Stats & Context */}
              <div className={styles.rightCol}>
                <div className={styles.statsGrid}>
                  <div className={`${styles.xpStatCard} group`}>
                    <div className={styles.xpStatIcon}>
                      <span className={`material-symbols-outlined text-[80px]`}>local_fire_department</span>
                    </div>
                    <p className={styles.xpStatLabel}>XP Earned</p>
                    <p className={styles.xpStatValue}>+{xp}</p>
                  </div>
                  <div className={`${styles.mistakesStatCard} group`}>
                    <div className={styles.mistakesStatIcon}>
                      <span className={`material-symbols-outlined text-[80px]`}>warning</span>
                    </div>
                    <p className={styles.mistakesStatLabel}>Mistakes</p>
                    <p className={styles.mistakesStatValue}>{wrongCount}</p>
                  </div>
                </div>

                {/* Node context */}
                <div className={styles.nodeContextCard}>
                  <div className={styles.contextHeader}>
                    <h4 className={styles.contextTitleLabel}>Node_Context</h4>
                  </div>
                  <div className={styles.contextVisualArea}>
                    <div className={styles.contextVisualBg} />
                    <div className={styles.contextVisualContent}>
                      <div className={styles.iconBox}>
                        <span className={`material-symbols-outlined text-red-400 text-2xl`}>{quiz.icon}</span>
                      </div>
                      <div className={styles.masteryBadge}>
                        MASTERY: {Math.round(mastery * 100)}% — CRITICAL
                      </div>
                    </div>
                  </div>
                  <div className={styles.nodeDetailsArea}>
                    <div>
                      <p className={styles.detailLabel}>Parent Node</p>
                      <div className={styles.parentRow}>
                        <span className={`material-symbols-outlined text-base text-vector-blue`}>arrow_upward</span>
                        {quiz.parentNode}
                      </div>
                    </div>
                    <div className={styles.divider} />
                    <div>
                      <p className={styles.detailLabelMb2}>Sub-Topics</p>
                      <div className={styles.subtopicsList}>
                        {quiz.connectedNodes.map((tag) => (
                          <span key={tag} className={styles.tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className={styles.exploreActionArea}>
                    <button onClick={() => navigate("/knowledge-tree")}
                      className={styles.exploreBtn}>
                      EXPLORE FULL GRAPH
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className={styles.footer}>
          <div className={styles.footerStatus}>
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
