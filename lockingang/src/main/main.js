const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { authorize } = require("../lib/googleAuth");
const { google } = require("googleapis");

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

  // Load from vite dev server if running, otherwise load the built file
  const startUrl =
    process.env.VITE_DEV_SERVER_URL ||
    `file://${path.join(__dirname, "../../dist/index.html")}`;

  mainWindow.loadURL(startUrl);

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }
}

// Trigger OAuth login and return success/failure to renderer
ipcMain.handle("google-auth", async () => {
  await authorize();
  return { success: true };
});

// Fetch upcoming calendar events
ipcMain.handle("calendar-get-events", async () => {
  const auth = await authorize();
  const calendar = google.calendar({ version: "v3", auth });
  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: new Date().toISOString(),
    maxResults: 20,
    singleEvents: true,
    orderBy: "startTime",
  });
  return res.data.items ?? [];
});

// Create a calendar event
ipcMain.handle("calendar-create-event", async (_event, eventData) => {
  const auth = await authorize();
  const calendar = google.calendar({ version: "v3", auth });
  const res = await calendar.events.insert({
    calendarId: "primary",
    resource: eventData,
  });
  return res.data;
});

// Delete a calendar event by ID
ipcMain.handle("calendar-delete-event", async (_event, eventId) => {
  const auth = await authorize();
  const calendar = google.calendar({ version: "v3", auth });
  await calendar.events.delete({ calendarId: "primary", eventId });
  return { success: true };
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});
