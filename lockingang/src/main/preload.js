const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  // Google Calendar
  googleAuth: () => ipcRenderer.invoke("google-auth"),
  calendarGetEvents: () => ipcRenderer.invoke("calendar-get-events"),
  calendarCreateEvent: (eventData) => ipcRenderer.invoke("calendar-create-event", eventData),
  calendarDeleteEvent: (eventId) => ipcRenderer.invoke("calendar-delete-event", eventId),
});
