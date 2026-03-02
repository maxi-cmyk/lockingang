import { useEffect, useRef, useState } from "react";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function todayLabel() {
  const now = new Date();
  return `TODAY, ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

const INIT_MSG = {
  role: "assistant",
  time: nowTime(),
  content: "INITIALIZING... SYSTEM READY.\n\nKNOWLEDGE BASE ONLINE. UPLOAD DOCUMENTS OR SCRAPE A URL VIA THE UPLINK PANEL. ASK ME ANYTHING ABOUT YOUR STORED DATA.",
};

// ── Icons ──────────────────────────────────────────────────────────────────

function IconBot() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <rect x="3" y="8" width="18" height="13" rx="2" />
      <path d="M8 8V6a4 4 0 018 0v2" />
      <circle cx="9" cy="14" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15" cy="14" r="1.5" fill="currentColor" stroke="none" />
      <path d="M9 18h6" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function IconDash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function IconTasks() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}

function IconTimer() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2" />
      <path d="M9 3h6" />
    </svg>
  );
}

function IconCog() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}

function IconClip() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.41 17.41a2 2 0 01-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

// ── Sidebar nav item ───────────────────────────────────────────────────────

function NavItem({ icon, label, active }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all ${
        active
          ? "bg-[#0a1628] border-l-2 border-[#00e5ff] text-[#00e5ff]"
          : "border-l-2 border-transparent text-[#00e5ff]/40 hover:text-[#00e5ff]/70 hover:bg-[#0a1628]/50"
      }`}
    >
      <span className={active ? "text-[#00e5ff]" : ""}>{icon}</span>
      <span className="text-xs tracking-widest font-bold">{label}</span>
    </div>
  );
}

// ── Sidebar KB panel section ───────────────────────────────────────────────

function UpLinkSection({ title, icon, children }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[#00e5ff]/60">{icon}</span>
        <span className="text-[#00e5ff]/60 text-xs tracking-widest">{title}</span>
      </div>
      <div className="pl-1">{children}</div>
    </div>
  );
}

// ── Date separator ─────────────────────────────────────────────────────────

function DateSep({ label }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-[#00e5ff]/20" />
      <span className="text-[#00e5ff]/50 text-xs tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-[#00e5ff]/20" />
    </div>
  );
}

// ── Message bubbles ────────────────────────────────────────────────────────

function BotMessage({ content, time }) {
  return (
    <div className="flex gap-3 mb-6">
      <div className="flex-shrink-0 w-9 h-9 border border-[#00e5ff]/50 bg-[#0a0e1a] flex items-center justify-center text-[#00e5ff]">
        <IconBot />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-3 mb-1.5">
          <span className="text-[#00e5ff] text-xs font-bold tracking-widest">SYSTEM_AI</span>
          <span className="text-[#00e5ff]/40 text-xs tracking-widest">{time}</span>
        </div>
        <div className="msg-bot-border bg-[#0d1525] cyber-glow px-5 py-4">
          <p className="text-sm leading-relaxed tracking-wide whitespace-pre-wrap text-gray-200 uppercase">
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}

function UserMessage({ content, time }) {
  return (
    <div className="flex gap-3 mb-6 justify-end">
      <div className="flex-1 min-w-0 flex flex-col items-end">
        <div className="flex items-baseline gap-3 mb-1.5">
          <span className="text-[#00e5ff]/40 text-xs tracking-widest">{time}</span>
          <span className="text-[#00e5ff]/70 text-xs font-bold tracking-widest">USER_01</span>
        </div>
        <div className="msg-user-border bg-[#0d1525] px-5 py-4 max-w-[75%]">
          <p className="text-sm leading-relaxed tracking-wide whitespace-pre-wrap text-gray-200">
            {content}
          </p>
        </div>
      </div>
      <div className="flex-shrink-0 w-9 h-9 border border-[#00e5ff]/30 bg-[#0a0e1a] flex items-center justify-center text-[#00e5ff]/60">
        <IconUser />
      </div>
    </div>
  );
}

function TypingMessage() {
  return (
    <div className="flex gap-3 mb-6">
      <div className="flex-shrink-0 w-9 h-9 border border-[#00e5ff]/50 bg-[#0a0e1a] flex items-center justify-center text-[#00e5ff]">
        <IconBot />
      </div>
      <div className="flex-1">
        <div className="flex items-baseline gap-3 mb-1.5">
          <span className="text-[#00e5ff] text-xs font-bold tracking-widest">SYSTEM_AI</span>
        </div>
        <div className="msg-bot-border bg-[#0d1525] px-5 py-4 inline-block">
          <div className="flex gap-1.5 items-center h-4">
            {[0, 150, 300].map((d) => (
              <span
                key={d}
                className="w-2 h-2 bg-[#00e5ff] animate-bounce"
                style={{ animationDelay: `${d}ms`, animationDuration: "1s" }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────────────

export default function App() {
  const [messages, setMessages] = useState([INIT_MSG]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const [scrapeUrl, setScrapeUrl] = useState("");
  const [selectedFiles, setSelectedFiles] = useState(null);
  const [actionPending, setActionPending] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const dateSep = todayLabel();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  // ── Chat ─────────────────────────────────────────────────────────────────

  async function sendMessage() {
    const question = input.trim();
    if (!question || pending) return;
    setError("");
    setPending(true);
    setInput("");
    const next = [...messages, { role: "user", content: question, time: nowTime() }];
    setMessages(next);
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "REQUEST FAILED.");
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.answer, time: nowTime() }]);
    } catch (err) {
      setError(err.message?.toUpperCase() || "SYSTEM ERROR. CHECK CONNECTION.");
    } finally {
      setPending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  // ── Upload ────────────────────────────────────────────────────────────────

  async function handleUpload() {
    if (!selectedFiles?.length) return;
    setActionPending(true);
    setError("");
    try {
      const fd = new FormData();
      for (let i = 0; i < selectedFiles.length; i++) fd.append("files", selectedFiles[i]);
      const res = await fetch(`${API_BASE}/ingest-files`, { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "UPLOAD FAILED.");
      const data = await res.json();
      setSelectedFiles(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setMessages((p) => [...p, { role: "assistant", content: `INGESTION COMPLETE. ${data.files_processed} FILE(S) STORED IN KNOWLEDGE BASE.`, time: nowTime() }]);
    } catch (err) {
      setError(err.message?.toUpperCase() || "UPLOAD ERROR.");
    } finally {
      setActionPending(false);
    }
  }

  // ── Scrape ────────────────────────────────────────────────────────────────

  async function handleScrape() {
    if (!scrapeUrl) return;
    setActionPending(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scrapeUrl }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "SCRAPE FAILED.");
      const data = await res.json();
      setScrapeUrl("");
      setMessages((p) => [...p, { role: "assistant", content: `SCRAPE COMPLETE. ${data.chunks_stored} CHUNKS EXTRACTED FROM ${data.source.toUpperCase()} AND STORED.`, time: nowTime() }]);
    } catch (err) {
      setError(err.message?.toUpperCase() || "SCRAPE ERROR.");
    } finally {
      setActionPending(false);
    }
  }

  // ── Clear DB ──────────────────────────────────────────────────────────────

  async function handleClear() {
    if (!confirmClear) { setConfirmClear(true); return; }
    setActionPending(true);
    setConfirmClear(false);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/clear-db?confirm=true`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "CLEAR FAILED.");
      setMessages((p) => [...p, { role: "assistant", content: "DATABASE WIPED. ALL VECTORS DELETED. UPLOAD NEW DOCUMENTS TO REINITIALIZE KNOWLEDGE BASE.", time: nowTime() }]);
    } catch (err) {
      setError(err.message?.toUpperCase() || "DATABASE ERROR.");
    } finally {
      setActionPending(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#080c14] font-mono overflow-hidden text-gray-200">

      {/* ── Sidebar ── */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-[#0a0e1a] border-r border-[#00e5ff]/15">

        {/* User header */}
        <div className="px-4 py-4 border-b border-[#00e5ff]/15">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-[#00e5ff]/50 bg-[#0d1525] flex items-center justify-center text-[#00e5ff] text-lg font-bold">
              ⬡
            </div>
            <div>
              <p className="text-[#00e5ff] text-xs font-bold tracking-widest leading-tight">LOCK_IN_GANG_OS</p>
              <p className="text-[#00e5ff]/40 text-xs tracking-widest">STATUS: FOCUSED</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="py-2 border-b border-[#00e5ff]/15">
          <NavItem icon={<IconDash />}  label="DASHBOARD"       active={false} />
          <NavItem icon={<IconChat />}  label="NEURAL_LIAISON"  active={true}  />
          <NavItem icon={<IconTasks />} label="TASKS_MATRIX"    active={false} />
          <NavItem icon={<IconTimer />} label="TIMER_MODULE"    active={false} />
          <NavItem icon={<IconCog />}   label="SYS_CONFIG"      active={false} />
        </nav>

        {/* Uplink panel */}
        <div className="flex-1 overflow-y-auto scrollbar-cyber px-4 py-4">
          <p className="text-[#00e5ff]/40 text-xs tracking-widest mb-4">── UPLINK_PANEL ──</p>

          <UpLinkSection title="UPLOAD_DOCS" icon={<IconUpload />}>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.md"
              onChange={(e) => setSelectedFiles(e.target.files)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full text-xs tracking-widest text-[#00e5ff]/60 border border-[#00e5ff]/25 py-2 px-3 hover:border-[#00e5ff]/60 hover:text-[#00e5ff] transition-colors text-left mb-2"
            >
              {selectedFiles?.length ? `${selectedFiles.length} FILE(S) SELECTED` : "+ SELECT FILES"}
            </button>
            {selectedFiles?.length > 0 && (
              <button
                onClick={handleUpload}
                disabled={actionPending}
                className="w-full text-xs tracking-widest font-bold bg-[#00e5ff] text-black py-2 px-3 hover:bg-[#00c8e0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {actionPending ? "INGESTING..." : "INGEST →"}
              </button>
            )}
          </UpLinkSection>

          <UpLinkSection title="SCRAPE_URL" icon={<IconGlobe />}>
            <input
              type="url"
              placeholder="HTTPS://..."
              value={scrapeUrl}
              onChange={(e) => setScrapeUrl(e.target.value)}
              className="w-full bg-[#0d1525] border border-[#00e5ff]/25 text-xs text-[#00e5ff] placeholder-[#00e5ff]/25 px-3 py-2 mb-2 focus:outline-none focus:border-[#00e5ff]/60 tracking-wider uppercase"
            />
            <button
              onClick={handleScrape}
              disabled={actionPending || !scrapeUrl}
              className="w-full text-xs tracking-widest font-bold bg-[#00e5ff] text-black py-2 px-3 hover:bg-[#00c8e0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {actionPending ? "SCRAPING..." : "SCRAPE →"}
            </button>
          </UpLinkSection>

          <UpLinkSection title="DATABASE" icon={<IconTrash />}>
            <button
              onClick={handleClear}
              disabled={actionPending}
              className={`w-full text-xs tracking-widest font-bold py-2 px-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed border ${
                confirmClear
                  ? "bg-red-600/80 border-red-500 text-white animate-pulse"
                  : "border-[#00e5ff]/20 text-[#00e5ff]/50 hover:border-red-500/60 hover:text-red-400"
              }`}
            >
              {confirmClear ? "CONFIRM WIPE?" : "CLEAR_DB"}
            </button>
            {confirmClear && (
              <button onClick={() => setConfirmClear(false)} className="w-full mt-1 text-xs text-[#00e5ff]/30 hover:text-[#00e5ff]/60 py-1 tracking-widest">
                CANCEL
              </button>
            )}
          </UpLinkSection>

          {error && (
            <div className="border border-red-500/50 bg-red-900/20 px-3 py-2 mt-2">
              <p className="text-red-400 text-xs tracking-widest leading-relaxed">{error}</p>
            </div>
          )}
        </div>

        {/* Version footer */}
        <div className="px-4 py-3 border-t border-[#00e5ff]/15">
          <p className="text-[#00e5ff]/25 text-xs tracking-widest">V.2.0.4 // BUILD_9921</p>
        </div>
      </aside>

      {/* ── Main panel ── */}
      <main className="flex-1 min-w-0 flex flex-col">

        {/* Top bar */}
        <header className="px-8 pt-5 pb-4 border-b border-[#00e5ff]/15 flex-shrink-0">
          <p className="text-[#00e5ff]/40 text-xs tracking-widest mb-2">HOME / NEURAL_LIAISON_V1.0</p>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-widest text-white">NEURAL_LIAISON_V1.0</h1>
            <div className="flex items-center gap-2 border border-[#00e5ff]/40 px-3 py-1.5 bg-[#00e5ff]/5">
              <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse" />
              <span className="text-[#00e5ff] text-xs tracking-widest font-bold">SYSTEM_ONLINE</span>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto scrollbar-cyber px-8 py-4">
          <DateSep label={dateSep} />
          {messages.map((msg, i) =>
            msg.role === "assistant"
              ? <BotMessage  key={i} content={msg.content} time={msg.time} />
              : <UserMessage key={i} content={msg.content} time={msg.time} />
          )}
          {pending && <TypingMessage />}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="flex-shrink-0 border-t border-[#00e5ff]/15 px-8 pt-4 pb-5 bg-[#0a0e1a]/60">

          {/* Attachment indicator */}
          {selectedFiles?.length > 0 && (
            <div className="flex items-center gap-2 mb-3 px-4 py-2 border border-[#00e5ff]/40 bg-[#00e5ff]/5 text-[#00e5ff] text-xs tracking-widest">
              <IconClip />
              <span>BLUEPRINT_ATTACHED: {Array.from(selectedFiles).map(f => f.name).join(", ")} — PENDING_UPLOAD...</span>
            </div>
          )}

          <div className="flex gap-0 items-stretch">
            {/* ATTACH */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-shrink-0 flex flex-col items-center justify-center gap-1 w-16 border border-[#00e5ff]/30 border-r-0 bg-[#0d1525] text-[#00e5ff]/60 hover:text-[#00e5ff] hover:bg-[#0d1525]/80 transition-colors"
            >
              <span className="text-lg">+</span>
              <span className="text-xs tracking-widest">ATTACH</span>
            </button>

            {/* Input */}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="INITIALIZE_QUERY..."
              rows={2}
              className="flex-1 resize-none bg-[#0d1525] border border-[#00e5ff]/30 text-sm text-gray-200 placeholder-[#00e5ff]/25 px-5 py-3 focus:outline-none focus:border-[#00e5ff]/60 tracking-wider scrollbar-cyber"
            />

            {/* Execute */}
            <button
              onClick={sendMessage}
              disabled={pending || !input.trim()}
              className="flex-shrink-0 flex items-center justify-center gap-2 px-6 bg-[#00e5ff] text-black text-sm font-bold tracking-widest hover:bg-[#00c8e0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors border-l-0"
            >
              EXECUTE <span>→</span>
            </button>
          </div>

          <div className="flex justify-between mt-2 text-xs text-[#00e5ff]/25 tracking-widest">
            <span>SUPPORTED FORMATS: PDF, MD, TXT</span>
            <span>PRESS ENTER TO SEND</span>
          </div>
        </div>
      </main>
    </div>
  );
}
