const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

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

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
