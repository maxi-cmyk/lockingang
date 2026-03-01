const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Read: fetch full graph
  getGraph: () => ipcRenderer.invoke("graph:get"),
  // Create: add a new node and connect it to a parent
  addNode: (title, parentTitle) => ipcRenderer.invoke("node:add", { title, parentTitle }),
  // Update: save edited node description from the Node Inspector
  updateNode: (nodeId, description) => ipcRenderer.invoke("node:update", { nodeId, description }),
});
