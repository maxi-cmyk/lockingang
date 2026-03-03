const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

// ── RAG Chatbot server config ────────────────────────────────────────────────
const CHATBOT_PORT = process.env.CHATBOT_PORT || "5001";
const CHATBOT_URL  = `http://127.0.0.1:${CHATBOT_PORT}`;
let chatbotProcess = null;

// ---------------------------------------------------------------------------
// File-based IPC paths
// __dirname = src/main  →  ../backend/node_logic/data/ipc = src/backend/node_logic/data/ipc
// This MUST match Python's IPC_DIR (data/ipc relative to node_logic CWD)
// ---------------------------------------------------------------------------
const IPC_DIR = path.join(__dirname, "../backend/node_logic/data/ipc");
const REQUEST_FILE = path.join(IPC_DIR, "request.json");
const RESPONSE_FILE = path.join(IPC_DIR, "response.json");

// ---------------------------------------------------------------------------
// Mutex — only ONE request can be in-flight to Python at a time.
// Concurrent callers wait in a queue.
// ---------------------------------------------------------------------------
let ipcBusy = false;
const ipcQueue = [];

function acquireIpc() {
  return new Promise((resolve) => {
    if (!ipcBusy) {
      ipcBusy = true;
      resolve();
    } else {
      ipcQueue.push(resolve);
    }
  });
}

function releaseIpc() {
  if (ipcQueue.length > 0) {
    const next = ipcQueue.shift();
    next(); // hand lock to next waiter
  } else {
    ipcBusy = false;
  }
}

// Poll for a file until it exists or times out
function waitForFile(filePath, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = setInterval(() => {
      if (fs.existsSync(filePath)) {
        clearInterval(poll);
        try {
          const raw = fs.readFileSync(filePath, "utf-8");
          resolve(JSON.parse(raw));
        } catch (err) {
          reject(new Error(`Failed to parse response: ${err.message}`));
        }
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(poll);
        reject(new Error("Timeout: Python backend did not respond within 10s. Is it running?"));
      }
    }, 100);
  });
}

// Send one request to Python, serialized through the mutex
async function sendToPython(payload) {
  await acquireIpc();
  try {
    // Clean up any leftover files from a crashed previous run
    try { if (fs.existsSync(REQUEST_FILE)) fs.unlinkSync(REQUEST_FILE); } catch { }
    try { if (fs.existsSync(RESPONSE_FILE)) fs.unlinkSync(RESPONSE_FILE); } catch { }

    fs.mkdirSync(IPC_DIR, { recursive: true });
    fs.writeFileSync(REQUEST_FILE, JSON.stringify(payload), "utf-8");
    console.log(`[IPC] → ${payload.functionCall}`);

    const data = await waitForFile(RESPONSE_FILE);
    try { fs.unlinkSync(RESPONSE_FILE); } catch { }
    console.log(`[IPC] ← ${payload.functionCall} OK`);
    return data;
  } finally {
    releaseIpc();
  }
}

// ---------------------------------------------------------------------------
// IPC Handlers
// ---------------------------------------------------------------------------

ipcMain.handle("graph:get", () => sendToPython({ functionCall: "MakeGraph" }));

ipcMain.handle("node:add", (_, { title, parentTitle }) =>
  sendToPython({ functionCall: "AddNode", title, parentTitle })
);

ipcMain.handle("node:update", (_, { nodeId, description }) =>
  sendToPython({ functionCall: "UpdateNode", nodeId, description })
);

// ---------------------------------------------------------------------------
// RAG Chatbot IPC handlers
// ---------------------------------------------------------------------------

/**
 * Relay a JSON body to the chatbot server and return parsed JSON.
 * Throws a descriptive Error if the server is unreachable.
 */
async function callChatbot(endpoint, body) {
  let resp;
  try {
    resp = await fetch(`${CHATBOT_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(
      `Chatbot server unreachable at ${CHATBOT_URL}. ` +
      `Start it with: cd src/backend/rag_chatbot && python chatbot_server.py`
    );
  }
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.detail || `HTTP ${resp.status}`);
  return data;
}

/** chat:message — send a user message and get a RAG response */
ipcMain.handle("chat:message", async (_, { message, history }) => {
  return callChatbot("/chat", { message, history: history || [] });
});

/** chat:upload — receive a file buffer from the renderer and ingest it */
ipcMain.handle("chat:upload", async (_, { buffer, name, type }) => {
  let resp;
  try {
    const blob = new Blob([Buffer.from(buffer)], { type: type || "application/octet-stream" });
    const form = new FormData();
    form.append("file", blob, name);
    resp = await fetch(`${CHATBOT_URL}/upload`, { method: "POST", body: form });
  } catch (err) {
    throw new Error(
      `Chatbot server unreachable at ${CHATBOT_URL}. ` +
      `Start it with: cd src/backend/rag_chatbot && python chatbot_server.py`
    );
  }
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.detail || `HTTP ${resp.status}`);
  return data;
});

/** node:summary — AI summary for a knowledge node */
ipcMain.handle("node:summary", async (_, { nodeId, nodeLabel, description }) => {
  return callChatbot("/node-summary", { nodeId, nodeLabel, description });
});

/** node:quiz — AI-generated quiz questions for a knowledge node */
ipcMain.handle("node:quiz", async (_, { nodeId, nodeLabel, description }) => {
  return callChatbot("/node-quiz", { nodeId, nodeLabel, description });
});

/** chat:health — check whether the chatbot server is running */
ipcMain.handle("chat:health", async () => {
  try {
    const resp = await fetch(`${CHATBOT_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return resp.ok ? await resp.json() : { status: "error" };
  } catch {
    return { status: "offline" };
  }
});

// ---------------------------------------------------------------------------
// Template → Knowledge Tree IPC
// ---------------------------------------------------------------------------

/**
 * template:build
 *  1. Sends the file to chatbot /build-tree  → gets { subject, nodes, edges }
 *  2. Sends BuildTree to node_logic          → resets the tree with real data
 *  3. Returns the full result to the renderer
 */
ipcMain.handle("template:build", async (_, { buffer, name, type }) => {
  // Step 1 — extract tree structure via OpenAI (chatbot server)
  let treeData;
  try {
    const blob = new Blob([Buffer.from(buffer)], { type: type || "application/octet-stream" });
    const form = new FormData();
    form.append("file", blob, name);
    const resp = await fetch(`${CHATBOT_URL}/build-tree`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(120_000),   // OpenAI can take up to 2 min
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.detail || `HTTP ${resp.status}`);
    treeData = data;
  } catch (err) {
    if (err.message?.includes("fetch") || err.name === "TimeoutError") {
      throw new Error("Chatbot server unreachable — is it running on port 5001?");
    }
    throw err;
  }

  // Step 2 — push the tree into node_logic
  const graph = await sendToPython({
    functionCall: "BuildTree",
    nodes: treeData.nodes,
    edges: treeData.edges,
  });

  return {
    subject:   treeData.subject,
    nodes:     treeData.nodes,
    edges:     treeData.edges,
    text_len:  treeData.text_len || 0,
    graph,
  };
});

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  const startUrl =
    process.env.VITE_DEV_SERVER_URL ||
    `file://${path.join(__dirname, "../../dist/index.html")}`;

  mainWindow.loadURL(startUrl);

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }
}

// ---------------------------------------------------------------------------
// Auto-spawn the RAG chatbot Python server
// ---------------------------------------------------------------------------
function loadDotEnv(envPath) {
  // Read the .env file and return its key=value pairs as an object
  const extra = {};
  if (!fs.existsSync(envPath)) return extra;
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (key) extra[key] = val;
  }
  return extra;
}

function spawnChatbotServer() {
  const serverScript = path.join(
    __dirname, "../backend/rag_chatbot/chatbot_server.py"
  );

  if (!fs.existsSync(serverScript)) {
    console.warn("[CHATBOT] chatbot_server.py not found — skipping auto-start.");
    return;
  }

  // Read .env and inject keys so any Python environment picks them up
  const envFile = path.join(path.dirname(serverScript), ".env");
  const envVars = loadDotEnv(envFile);
  console.log(`[CHATBOT] Loaded .env keys: ${Object.keys(envVars).join(", ") || "none"}`);

  // Prefer python3 on *nix, python on Windows
  const pyExe = process.platform === "win32" ? "python" : "python3";

  chatbotProcess = spawn(pyExe, [serverScript], {
    cwd: path.dirname(serverScript),
    env: { ...process.env, ...envVars, PYTHONIOENCODING: "utf-8" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  chatbotProcess.stdout.on("data", (d) =>
    console.log(`[CHATBOT] ${d.toString().trim()}`)
  );
  chatbotProcess.stderr.on("data", (d) =>
    console.error(`[CHATBOT ERR] ${d.toString().trim()}`)
  );
  chatbotProcess.on("exit", (code) =>
    console.log(`[CHATBOT] Process exited with code ${code}`)
  );
  chatbotProcess.on("error", (err) =>
    console.error(`[CHATBOT] Failed to start: ${err.message}`)
  );

  console.log(`[CHATBOT] Started PID ${chatbotProcess.pid}`);
}

app.whenReady().then(() => {
  spawnChatbotServer();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (chatbotProcess) {
    chatbotProcess.kill();
    chatbotProcess = null;
  }
  if (process.platform !== "darwin") app.quit();
});
