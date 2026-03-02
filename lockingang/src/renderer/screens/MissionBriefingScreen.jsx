import React from "react";
import styles from "./MissionBriefingScreen.module.css";

const MissionBriefingScreen = ({
  onClose,
  onEngage,
}) => {
  return (
    <div className={styles.container}>
      {/* Background grid */}
      <div className={styles.bgGrid}></div>
      {/* Scanline */}
      <div className={styles.scanline}></div>

      {/* Decorative circles */}
      <div className={styles.decorativeCircle1}></div>
      <div className={styles.decorativeCircle2}></div>
      <div className={styles.decorativeCircle3}></div>

      {/* Main Content */}
      <main className={styles.mainArea}>
        <div className={styles.card}>
          {/* Decorative corners */}
          <div className={styles.cornerTL}></div>
          <div className={styles.cornerTR}></div>
          <div className={styles.cornerBL}></div>
          <div className={styles.cornerBR}></div>

          {/* Card Header */}
          <div className={styles.cardHeader}>
            <h1 className={styles.headerTitle}>
              MISSION BRIEFING
            </h1>
            <div className={styles.headerStats}>
              <span>SECURE_CONN_ESTABLISHED</span>
              <span>::</span>
              <span>LATENCY: 12ms</span>
            </div>
          </div>

          {/* Card Body Grid */}
          <div className={styles.cardBody}>
            {/* Left: Objective Overview */}
            <div className={styles.leftPanel}>
              <div className={styles.leftPanelGradient}></div>

              <div>
                <div className={styles.sectionHeader}>
                  <span className={`material-symbols-outlined text-vector-blue text-sm`}>label_important</span>
                  <p className={styles.sectionLabel}>
                    OBJECTIVE_OVERVIEW
                  </p>
                </div>
                <h3 className={styles.objectiveTitle}>
                  History Essay: Industrial Revolution
                </h3>
                <p className={styles.objectiveDesc}>
                  Analyze the primary socio-economic causes of the Industrial
                  Revolution in 18th century Britain. Focus on technological
                  innovations and labor shifts.
                </p>
              </div>

              <div className={styles.statsGrid}>
                <div className={styles.statBlock}>
                  <p className={styles.statLabel}>
                    DIFFICULTY_LEVEL
                  </p>
                  <div className={styles.difficultyRow}>
                    <span className={styles.difficultyText}>HARD</span>
                    <div className={styles.difficultyBars}>
                      <div className={styles.diffBarFull}></div>
                      <div className={styles.diffBarFull}></div>
                      <div className={styles.diffBarFull}></div>
                      <div className={styles.diffBarEmpty}></div>
                      <div className={styles.diffBarEmpty}></div>
                    </div>
                  </div>
                </div>

                <div className={styles.statBlock}>
                  <p className={styles.statLabel}>
                    FOCUS_TYPE
                  </p>
                  <div className={styles.focusRow}>
                    <span className={`material-symbols-outlined text-vector-blue text-base`}>psychology</span>
                    <span className={styles.focusText}>Deep Work</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Intelligence Report */}
            <div className={`${styles.rightPanel} group`}>
              <div className={styles.reportHeader}>
                <div className={styles.reportTitleWrapper}>
                  <span className={`material-symbols-outlined text-vector-blue text-sm`}>hub</span>
                  <p className={styles.sectionLabel}>
                    INTELLIGENCE_REPORT
                  </p>
                </div>
                <span className={styles.nodeIdLabel}>NODE_ID: 8821a</span>
              </div>

              <div className={styles.graphContainer}>
                <div className={styles.graphBackground}></div>
                <div className={styles.graphWrapper}>
                  <svg className={styles.svgGraph} fill="none" height="100%" viewBox="0 0 300 200" width="100%">
                    <path d="M150 100 L 80 60" stroke="#7DF9FF" strokeOpacity="0.6" strokeWidth="1"></path>
                    <path d="M150 100 L 220 70" stroke="#7DF9FF" strokeOpacity="0.6" strokeWidth="1"></path>
                    <path d="M150 100 L 120 160" stroke="#7DF9FF" strokeOpacity="0.6" strokeWidth="1"></path>
                    <path d="M80 60 L 60 120" stroke="#7DF9FF" strokeDasharray="4 2" strokeOpacity="0.4" strokeWidth="0.5"></path>
                    <circle cx="150" cy="100" fill="#0D0221" r="6" stroke="#7DF9FF" strokeWidth="2"></circle>
                    <circle className="animate-ping" cx="150" cy="100" r="12" stroke="#7DF9FF" strokeOpacity="0.3" strokeWidth="1" style={{ animationDuration: "3s" }}></circle>
                    <circle cx="80" cy="60" fill="#0D0221" r="4" stroke="#7DF9FF" strokeWidth="1.5"></circle>
                    <circle cx="220" cy="70" fill="#0D0221" r="4" stroke="#7DF9FF" strokeWidth="1.5"></circle>
                    <circle cx="120" cy="160" fill="#0D0221" r="4" stroke="#7DF9FF" strokeWidth="1.5"></circle>
                    <circle cx="60" cy="120" fill="#0D0221" opacity="0.7" r="3" stroke="#7DF9FF" strokeWidth="1"></circle>
                    <text fill="#7DF9FF" fontFamily="monospace" fontSize="8" opacity="0.8" x="160" y="95">CURRENT_TASK</text>
                    <text fill="#7DF9FF" fontFamily="monospace" fontSize="6" opacity="0.6" x="85" y="55">Eco.Factors</text>
                    <text fill="#7DF9FF" fontFamily="monospace" fontSize="6" opacity="0.6" x="225" y="65">Steam_Pwr</text>
                    <text fill="#7DF9FF" fontFamily="monospace" fontSize="6" opacity="0.6" x="125" y="165">Labor_Laws</text>
                  </svg>
                </div>

                <div className={styles.linkedNodesBanner}>
                  <span className="text-vector-blue">&gt;</span> LINKED: '18th Century Economics', 'Steam Power'
                </div>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className={styles.statsBarList}>
            <div className={`${styles.xpBlock} group`}>
              <div className={styles.xpGradient}></div>
              <p className={styles.statLabel}>PROJECTED_XP</p>
              <div className={styles.xpNumberWrapper}>
                <span className={styles.xpValue}>250</span>
                <span className={styles.xpUnit}>XP</span>
              </div>
            </div>

            <div className={`${styles.xpBlock} group`}>
              <div className={styles.xpGradient}></div>
              <p className={styles.statLabel}>ESTIMATED_TIME</p>
              <div className={styles.xpNumberWrapper}>
                <span className={styles.xpValue}>25:00</span>
                <span className={styles.xpUnit}>MIN</span>
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className={styles.footerArea}>
            <div className={styles.footerHoverGradient}></div>
            <button
              onClick={onEngage}
              className={`${styles.engageButton} group`}
            >
              <div className={styles.engageButtonGlow}></div>
              <div className={styles.engageButtonInner}>
                <span className={`material-symbols-outlined mr-3 animate-[spin_3s_linear_infinite]`}>api</span>
                <span className={styles.engageButtonText}>ENGAGE_ZEN_MODE</span>
                <span className={`material-symbols-outlined ml-2 opacity-0 group-hover:opacity-100 transition-opacity -mr-6 group-hover:mr-0`}>arrow_forward</span>
              </div>
            </button>
          </div>
        </div>

        {/* Bottom context */}
        <div className={styles.bottomContext}>
          <p>UGTA_SYSTEM_V.4.2.1 // READY_FOR_DEPLOYMENT</p>
          {onClose && <p className={styles.abortText}>PRESS 'ESC' TO ABORT MISSION</p>}
        </div>
      </main>
    </div>
  );
};

export default MissionBriefingScreen;
