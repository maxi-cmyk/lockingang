const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  // We can expose ipcRenderer functions here later
});
