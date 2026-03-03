import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar/Sidebar";

// ── Helpers ──────────────────────────────────────────────────────────────────

const timestamp = () => {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
};

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ALLOWED_EXT = [".pdf", ".txt", ".md", ".markdown", ".docx", ".csv"];

const INITIAL_MESSAGES = [
  {
    id: "sys_init",
    from: "bot",
    time: "00:00:00",
    text:
      "SYSTEM READY — NEURAL_LIAISON_V2.0 (RAG MODE)\n\n" +
      "Hello Marty. I'm connected to your knowledge base.\n\n" +
      "You can:\n" +
      "  • Ask me anything about your study materials\n" +
      "  • Attach a file (PDF, DOCX, TXT, MD, CSV) to expand my knowledge\n" +
      "  • Dump any thought and I'll help you process it\n\n" +
      "What would you like to explore today?",
  },
];

// ── Component ────────────────────────────────────────────────────────────────

const ChatbotScreen = () => {
  const location = useLocation();
  const fileInputRef = useRef(null);
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [tasks, setTasks] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [serverOnline, setServerOnline] = useState(null);   // null = checking
  const [attachedFile, setAttachedFile] = useState(null);   // { name, type, buffer }
  const [uploadStatus, setUploadStatus] = useState(null);   // "uploading" | "done" | "error"

  // ── Server health check ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const result = await window.api.chat.health();
        if (!cancelled) setServerOnline(result.status === "ok");
      } catch {
        if (!cancelled) setServerOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // ── Auto-scroll ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, isTyping]);

  // ── Brain dump from ZenMode ────────────────────────────────────────────────
  useEffect(() => {
    const dump = location.state?.brainDump;
    if (!dump) return;
    setTimeout(() => sendMessage(dump), 400);
    window.history.replaceState({}, "");
  }, []); // eslint-disable-line

  // ── Core send ─────────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text) => {
      const trimmed = (text || input).trim();
      if (!trimmed || isTyping) return;
      setInput("");

      const userMsg = {
        id: `u_${Date.now()}`,
        from: "user",
        time: timestamp(),
        text: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      try {
        // Pass recent history for multi-turn context (skip the system init msg)
        const history = [...messages.slice(1), userMsg];
        const { response, sources } = await window.api.chat.sendMessage(trimmed, history);

        let displayText = response;
        if (sources && sources.length > 0) {
          displayText += `\n\n> SOURCES: ${sources.join(" · ")}`;
        }

        const botMsg = {
          id: `b_${Date.now()}`,
          from: "bot",
          time: timestamp(),
          text: displayText,
        };
        setMessages((prev) => [...prev, botMsg]);
      } catch (err) {
        const msg = err.message || "";
        const isOffline = msg.includes("unreachable") || msg.includes("fetch") || msg.includes("ECONNREFUSED");
        const isAuthError = msg.includes("401") || msg.toLowerCase().includes("api key") || msg.toLowerCase().includes("bearer");

        let errorText;
        if (isAuthError) {
          errorText =
            `ERROR: OpenAI API key not set.\n\n` +
            `> Open src/backend/rag_chatbot/.env\n` +
            `> Set OPENAI_API_KEY=sk-...\n` +
            `> Then restart the chatbot server.`;
        } else if (isOffline) {
          errorText =
            `ERROR: Chatbot server is offline.\n\n` +
            `> cd src/backend/rag_chatbot\n` +
            `> python chatbot_server.py`;
        } else {
          errorText = `ERROR: ${msg}`;
        }

        const errMsg = {
          id: `e_${Date.now()}`,
          from: "bot",
          time: timestamp(),
          text: errorText,
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsTyping(false);
      }
    },
    [input, isTyping, messages]
  );

  // ── File selection ────────────────────────────────────────────────────────
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";      // reset input so same file can be re-selected
    if (!file) return;

    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!ALLOWED_TYPES.has(file.type) && !ALLOWED_EXT.includes(ext)) {
      alert(`Unsupported file type. Allowed: ${ALLOWED_EXT.join(", ")}`);
      return;
    }

    const buffer = await file.arrayBuffer();
    setAttachedFile({ name: file.name, type: file.type, buffer });
    setUploadStatus(null);
  };

  // ── File upload ───────────────────────────────────────────────────────────
  const uploadAttachment = async () => {
    if (!attachedFile) return;
    setUploadStatus("uploading");

    // Show a "uploading…" system message
    const uploadingMsg = {
      id: `sys_up_${Date.now()}`,
      from: "bot",
      time: timestamp(),
      text: `INGESTING FILE: "${attachedFile.name}"\n> Chunking and embedding — please wait...`,
    };
    setMessages((prev) => [...prev, uploadingMsg]);

    try {
      const result = await window.api.chat.uploadFile(
        attachedFile.buffer,
        attachedFile.name,
        attachedFile.type
      );
      setUploadStatus("done");
      setAttachedFile(null);

      const doneMsg = {
        id: `sys_done_${Date.now()}`,
        from: "bot",
        time: timestamp(),
        text:
          `FILE INGESTED: "${result.filename}"\n` +
          `> ${result.chunks} chunk(s) stored in Pinecone vector DB\n` +
          `> You can now ask questions about this document.`,
      };
      setMessages((prev) => [...prev, doneMsg]);
    } catch (err) {
      setUploadStatus("error");
      const errMsg = {
        id: `sys_err_${Date.now()}`,
        from: "bot",
        time: timestamp(),
        text: `UPLOAD FAILED: ${err.message}`,
      };
      setMessages((prev) => [...prev, errMsg]);
    }
  };

  const clearAttachment = () => {
    setAttachedFile(null);
    setUploadStatus(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex overflow-hidden bg-vector-bg text-vector-white font-terminal relative">
      <div className="scanline" />
      <Sidebar />

      <main className="flex-1 flex overflow-hidden relative">
        {/* ── Chat column ─────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col relative h-full">

          {/* Header */}
          <header className="h-14 border-b border-vector-blue flex items-center justify-between px-6 backdrop-blur-md bg-vector-bg/40 z-10 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-vector-white/60 font-mono tracking-wider">CHATBOT</span>
              <span className="text-[12px] text-vector-blue font-bold">&gt;&gt;</span>
              <span className="text-[12px] text-vector-blue font-mono tracking-wider terminal-text">
                NEURAL_LIAISON_V2.0 · RAG
              </span>
            </div>
            <div className="flex items-center gap-4">
              {/* Server status badge */}
              <div className="flex items-center gap-1.5">
                {serverOnline === null ? (
                  <div className="h-2 w-2 bg-yellow-400 animate-pulse rounded-full" />
                ) : serverOnline ? (
                  <div className="h-2 w-2 bg-green-500 animate-pulse rounded-full" />
                ) : (
                  <div className="h-2 w-2 bg-red-500 rounded-full" />
                )}
                <span className="text-[10px] text-vector-blue tracking-widest font-mono">
                  {serverOnline === null ? "CHECKING" : serverOnline ? "ONLINE" : "OFFLINE"}
                </span>
              </div>
              <div className="px-3 py-1 border border-vector-blue/30 bg-vector-bg text-[10px] text-vector-blue tracking-widest">
                PINECONE · OPENAI
              </div>
            </div>
          </header>

          {/* Chat messages */}
          <div ref={chatRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 custom-scrollbar">
            <div className="flex items-center justify-center my-2">
              <div className="h-px bg-vector-blue/20 w-16" />
              <span className="mx-4 text-[10px] font-mono text-vector-white/40 tracking-widest uppercase">
                RAG SESSION
              </span>
              <div className="h-px bg-vector-blue/20 w-16" />
            </div>

            {messages.map((msg) =>
              msg.from === "bot" ? (
                <div key={msg.id} className="flex gap-4 max-w-3xl">
                  <div className="shrink-0">
                    <div className="size-10 border border-vector-blue bg-vector-bg flex items-center justify-center">
                      <span className="material-symbols-outlined text-vector-blue text-xl">smart_toy</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-vector-blue font-bold text-[11px] tracking-widest uppercase">
                        NEURAL_LIAISON
                      </span>
                      <span className="text-[10px] text-vector-white/40 font-mono">{msg.time}</span>
                    </div>
                    <div className="border border-vector-blue bg-vector-blue/5 p-4 text-vector-blue text-xs font-mono leading-relaxed shadow-card-glow relative">
                      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-vector-blue" />
                      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-vector-blue" />
                      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-vector-blue" />
                      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-vector-blue" />
                      <pre className="whitespace-pre-wrap font-mono">{msg.text}</pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div key={msg.id} className="flex gap-4 max-w-3xl self-end flex-row-reverse">
                  <div className="shrink-0">
                    <div className="size-10 border border-vector-white/40 bg-vector-bg flex items-center justify-center">
                      <span className="material-symbols-outlined text-vector-white text-xl">person</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-vector-white/40 font-mono">{msg.time}</span>
                      <span className="text-vector-white font-bold text-[11px] tracking-widest uppercase">MARTY</span>
                    </div>
                    <div className="border border-vector-white/30 bg-vector-white/5 p-4 text-vector-white text-xs font-mono leading-relaxed relative">
                      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-vector-white/30" />
                      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-vector-white/30" />
                      <pre className="whitespace-pre-wrap font-mono">{msg.text}</pre>
                    </div>
                  </div>
                </div>
              )
            )}

            {isTyping && (
              <div className="flex gap-4 max-w-3xl">
                <div className="shrink-0">
                  <div className="size-10 border border-vector-blue bg-vector-bg flex items-center justify-center">
                    <span className="material-symbols-outlined text-vector-blue text-xl">smart_toy</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 border border-vector-blue/30 bg-vector-blue/5 px-4 py-3">
                  <span className="text-vector-blue/60 text-[11px] font-mono animate-pulse">
                    QUERYING RAG
                  </span>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-1.5 w-1.5 bg-vector-blue animate-bounce rounded-full"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Input area ──────────────────────────────────────────────── */}
          <div className="p-4 bg-vector-bg border-t border-vector-blue/30 relative z-20 shrink-0">
            <div className="max-w-4xl mx-auto flex flex-col gap-2">

              {/* Attachment chip */}
              {attachedFile && (
                <div className="flex items-center gap-2 px-3 py-1.5 border border-vector-blue/40 bg-vector-blue/10 w-fit">
                  <span className="material-symbols-outlined text-vector-blue text-sm">attach_file</span>
                  <span className="text-[11px] font-mono text-vector-blue truncate max-w-[200px]">
                    {attachedFile.name}
                  </span>
                  {uploadStatus === "uploading" ? (
                    <span className="text-[10px] font-mono text-yellow-400 animate-pulse">UPLOADING…</span>
                  ) : (
                    <>
                      <button
                        onClick={uploadAttachment}
                        className="text-[10px] font-mono text-green-400 hover:text-green-300 tracking-widest border border-green-500/30 px-2 py-0.5 hover:bg-green-500/10 transition-colors"
                      >
                        INGEST
                      </button>
                      <button
                        onClick={clearAttachment}
                        className="text-vector-white/40 hover:text-vector-white transition-colors"
                        title="Remove attachment"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Text input row */}
              <div className="flex items-stretch gap-0 relative">
                {/* Attach button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title={`Attach file (${ALLOWED_EXT.join(", ")})`}
                  className="px-3 bg-vector-bg border border-r-0 border-vector-blue/30 text-vector-blue/60 hover:text-vector-blue hover:bg-vector-blue/10 transition-colors flex items-center"
                >
                  <span className="material-symbols-outlined text-lg">attach_file</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_EXT.join(",")}
                  className="hidden"
                  onChange={handleFileSelect}
                />

                {/* Textarea */}
                <div className="flex-1 bg-transparent relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-vector-bg border border-vector-blue/30 text-vector-white font-mono placeholder:text-vector-white/30 focus:border-vector-blue focus:ring-1 focus:ring-vector-blue focus:outline-none p-4 min-h-[60px] resize-none text-xs"
                    placeholder="ASK ABOUT YOUR MATERIALS, DUMP A THOUGHT, OR REQUEST HELP…"
                  />
                  <div className="absolute top-0 right-0 w-0 h-0 border-t-[10px] border-t-vector-blue border-l-[10px] border-l-transparent pointer-events-none" />
                </div>

                {/* Send button */}
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isTyping}
                  className="px-6 bg-vector-blue text-vector-bg font-bold font-mono tracking-widest hover:brightness-110 transition-all flex items-center gap-2 border-r border-t border-b border-vector-blue text-xs disabled:opacity-40"
                >
                  <span className="hidden md:inline">SEND</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>

              <div className="flex justify-between items-center text-[10px] text-vector-white/30 font-mono px-1 tracking-widest">
                <span>
                  ATTACH: PDF · DOCX · TXT · MD · CSV → auto-indexed into Pinecone
                </span>
                <span>ENTER TO SEND · SHIFT+ENTER FOR NEWLINE</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Side panel (tasks) ───────────────────────────────────────────── */}
        <div className="w-64 flex-shrink-0 border-l border-vector-blue/20 flex flex-col bg-vector-bg/50">
          <div className="px-4 py-3 border-b border-vector-blue/20">
            <p className="text-[10px] text-vector-blue/60 font-mono tracking-widest uppercase">
              AUTO_SCHEDULED_TASKS
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 gap-2">
                <span className="material-symbols-outlined text-vector-blue/20 text-3xl">task_alt</span>
                <p className="text-[10px] text-vector-white/20 font-mono text-center">
                  Tasks extracted by the AI appear here
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {tasks.map((task) => (
                  <div key={task.id} className="border border-vector-blue/20 bg-vector-blue/5 p-3">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-green-400 text-sm mt-0.5">
                        check_circle
                      </span>
                      <div>
                        <p className="text-[11px] font-mono text-vector-white">{task.text}</p>
                        <p className="text-[10px] font-mono text-vector-blue/60 mt-1">
                          <span className="material-symbols-outlined text-[13px] align-middle">schedule</span>
                          {" "}{task.scheduled}
                        </p>
                        <span
                          className={`text-[9px] font-mono tracking-widest px-1.5 py-0.5 mt-1 inline-block border ${task.priority === "HIGH"
                              ? "border-red-500/40 text-red-400"
                              : "border-vector-blue/30 text-vector-blue/60"
                            }`}
                        >
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Knowledge base status */}
          <div className="px-4 py-3 border-t border-vector-blue/20">
            <p className="text-[10px] text-vector-blue/60 font-mono tracking-widest uppercase mb-2">
              KNOWLEDGE_BASE
            </p>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-vector-blue/40 text-sm">
                database
              </span>
              <div>
                <p className="text-[10px] font-mono text-vector-white/60">Pinecone Vector DB</p>
                <p className={`text-[9px] font-mono tracking-widest ${serverOnline ? "text-green-400" : "text-red-400"
                  }`}>
                  {serverOnline === null ? "CHECKING..." : serverOnline ? "CONNECTED" : "OFFLINE"}
                </p>
              </div>
            </div>
            <p className="text-[9px] font-mono text-vector-white/30 mt-2 leading-relaxed">
              Attach files above to add to your knowledge base. All uploads are chunked &amp; embedded automatically.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ChatbotScreen;
