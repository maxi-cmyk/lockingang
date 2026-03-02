import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";
import styles from "./ChatbotScreen.module.css";

// Preset AI response logic
const getBotResponse = (userText) => {
  const t = userText.toLowerCase().trim();
  if (t.includes("buy milk") || t.includes("milk")) {
    return {
      text: "TASK_PARSED: \"Buy milk\"\n\nI've added this to your task list and auto-scheduled it for tomorrow between your 10am and 12pm lectures — you have a 45-minute window.\n\n> TODOIST_SYNC: ✓ Task added\n> CALENDAR_BLOCK: Tomorrow 11:00–11:15\n> PRIORITY: LOW",
      createdTask: { id: `task_${Date.now()}`, text: "Buy milk", scheduled: "Tomorrow 11:00–11:15", priority: "LOW" },
    };
  }
  if (t.includes("common dist") || t.includes("distribution") || t.includes("normal") || t.includes("binomial")) {
    return {
      text: "CONCEPT_ANALYSIS: Common Distributions\n\nYour mastery score for this node is currently 0.20 — CRITICAL.\n\nI recommend:\n1. Start with Expectation & Variance review (your score: 0.82)\n2. Work through Normal Distribution → Z-scores\n3. Practice Binomial Distribution problems\n4. Quiz session scheduled for tonight\n\n> BRIDGE NODE: Exp & Var → Common Dist is active\n> REVIEW_BLOCK: Tonight 11pm added to calendar",
      createdTask: null,
    };
  }
  if (t.includes("quiz") || t.includes("test") || t.includes("review")) {
    return {
      text: "SCHEDULING REVIEW SESSION...\n\nBased on your forgetting curve analysis:\n\n> COMMON_DIST: URGENT — review NOW\n> NORMAL_DIST: due in 5 hours\n> CENTRAL_LIMIT: due in 2 days\n\nI've scheduled a 30-minute quiz block for tonight at 11pm.\n\n> CALENDAR_EVENT: Added ✓\n> TODOIST_TASK: Added ✓",
      createdTask: { id: `task_${Date.now()}`, text: "Quiz: Common Distributions", scheduled: "Tonight 11:00pm", priority: "HIGH" },
    };
  }
  if (t.includes("help") || t.includes("what") || t.includes("how")) {
    return {
      text: "SYSTEM READY. I can help you with:\n\n1. TASK CAPTURE — dump any thought and I'll schedule it\n2. STUDY ANALYSIS — ask about any concept or node\n3. SCHEDULING — I'll find gaps in your calendar\n4. FORGETTING FORECAST — ask what's about to decay\n\nWhat would you like to do?",
      createdTask: null,
    };
  }
  return {
    text: `ACKNOWLEDGED: "${userText}"\n\nProcessing your request... I've logged this and will handle it when context permits.\n\nIf this is a task, type it again with more detail and I'll schedule it automatically.`,
    createdTask: null,
  };
};

const INITIAL_MESSAGES = [
  {
    id: "sys_init",
    from: "bot",
    time: "11:00:01",
    text: "SYSTEM READY — NEURAL_LIAISON_V1.0\n\nHello Marty. I'm monitoring your knowledge state.\n\nCurrent alerts:\n> COMMON_DIST: mastery 0.20 — CRITICAL\n> NORMAL_DIST: mastery 0.15 — CRITICAL\n> 2 nodes due for review TODAY\n\nDump any stray thoughts here. I'll handle scheduling so you can stay focused.",
  },
];

const ChatbotScreen = () => {
  const location = useLocation();
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [tasks, setTasks] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  const now = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  };

  // Handle brain dump arriving from ZenMode
  useEffect(() => {
    const dump = location.state?.brainDump;
    if (!dump) return;
    // Auto-send it after a brief delay for drama
    setTimeout(() => sendMessage(dump), 400);
    // Clear location state to avoid re-triggering on back navigation
    window.history.replaceState({}, "");
  }, []); // eslint-disable-line

  // Auto-scroll
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, isTyping]);

  const sendMessage = (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed) return;
    setInput("");

    const userMsg = { id: `u_${Date.now()}`, from: "user", time: now(), text: trimmed };
    setMessages((prev) => [...prev, userMsg]);

    setIsTyping(true);
    setTimeout(() => {
      const { text: botText, createdTask } = getBotResponse(trimmed);
      const botMsg = { id: `b_${Date.now()}`, from: "bot", time: now(), text: botText };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
      if (createdTask) {
        setTasks((prev) => [...prev, createdTask]);
      }
    }, 900 + Math.random() * 500);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={styles.container}>
      <div className="scanline" />
      <Sidebar />

      <main className={styles.mainContent}>
        {/* Chat column */}
        <div className={styles.chatColumn}>
          {/* Chat area */}
          <div ref={chatRef} className={`${styles.chatArea} custom-scrollbar`}>
            <div className={styles.sessionHeader}>
              <div className={styles.dividerLine} />
              <span className={styles.sessionLabel}>TODAY — STUDY SESSION</span>
              <div className={styles.dividerLine} />
            </div>

            {messages.map((msg) => (
              msg.from === "bot" ? (
                <div key={msg.id} className={styles.botMessageRow}>
                  <div className={styles.avatarWrapper}>
                    <div className={styles.botAvatar}>
                      <span className={`material-symbols-outlined ${styles.botIcon}`}>smart_toy</span>
                    </div>
                  </div>
                  <div className={styles.messageContent}>
                    <div className={styles.messageHeader}>
                      <span className={styles.botName}>NEURAL_LIAISON</span>
                      <span className={styles.messageTime}>{msg.time}</span>
                    </div>
                    <div className={styles.botBubble}>
                      <div className={styles.cornerTL} />
                      <div className={styles.cornerTR} />
                      <div className={styles.cornerBL} />
                      <div className={styles.cornerBR} />
                      <pre className={styles.messageText}>{msg.text}</pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={msg.id} className={styles.userMessageRow}>
                  <div className={styles.avatarWrapper}>
                    <div className={styles.userAvatar}>
                      <span className={`material-symbols-outlined ${styles.userIcon}`}>person</span>
                    </div>
                  </div>
                  <div className={styles.userMessageContent}>
                    <div className={styles.messageHeader}>
                      <span className={styles.messageTime}>{msg.time}</span>
                      <span className={styles.userName}>MARTY</span>
                    </div>
                    <div className={styles.userBubble}>
                      <div className={styles.userCornerTL} />
                      <div className={styles.userCornerBR} />
                      <pre className={styles.messageText}>{msg.text}</pre>
                    </div>
                  </div>
                </div>
              )
            ))}

            {isTyping && (
              <div className={styles.botMessageRow}>
                <div className={styles.avatarWrapper}>
                  <div className={styles.botAvatar}>
                    <span className={`material-symbols-outlined ${styles.botIcon}`}>smart_toy</span>
                  </div>
                </div>
                <div className={styles.typingBubble}>
                  <span className={styles.typingText}>PROCESSING</span>
                  <div className={styles.typingDots}>
                    {[0, 1, 2].map(i => (
                      <div key={i} className={styles.typingDot}
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className={styles.inputArea}>
            <div className={styles.inputContainer}>
              <div className={styles.inputRow}>
                <button className={styles.iconButton}>
                  <span className={`material-symbols-outlined ${styles.actionIcon}`}>add</span>
                </button>
                <div className={styles.textareaWrapper}>
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className={styles.inputField}
                    placeholder="Ask anything"
                  />
                </div>
                <button className={styles.iconButton}>
                  <span className={`material-symbols-outlined ${styles.actionIcon}`}>mic</span>
                </button>
                <button
                  onClick={() => input.trim() ? sendMessage() : null}
                  disabled={isTyping || !input.trim()}
                  className={styles.sendButton}
                >
                  <span className={`material-symbols-outlined ${styles.sendIcon}`}>
                    arrow_upward
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Task panel */}
        <div className={styles.taskPanel}>
          <div className={styles.panelHeader}>
            <p className={styles.panelTitle}>AUTO_SCHEDULED_TASKS</p>
          </div>
          <div className={`${styles.taskListArea} custom-scrollbar`}>
            {tasks.length === 0 ? (
              <div className={styles.emptyTaskState}>
                <span className={`material-symbols-outlined ${styles.emptyTaskIcon}`}>task_alt</span>
                <p className={styles.emptyTaskText}>Dump thoughts in chat — tasks appear here</p>
              </div>
            ) : (
              <div className={styles.taskList}>
                {tasks.map((task) => (
                  <div key={task.id} className={styles.taskCard}>
                    <div className={styles.taskCardContent}>
                      <span className={`material-symbols-outlined ${styles.taskCheckIcon}`}>check_circle</span>
                      <div>
                        <p className={styles.taskText}>{task.text}</p>
                        <p className={styles.taskSchedule}>
                          <span className={`material-symbols-outlined ${styles.scheduleIcon}`}>schedule</span>
                          {" "}{task.scheduled}
                        </p>
                        <span className={`${styles.taskPriority} ${task.priority === "HIGH"
                          ? styles.priorityHigh
                          : styles.priorityLow
                          }`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChatbotScreen;
