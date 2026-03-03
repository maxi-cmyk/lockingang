const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // ── Knowledge graph ────────────────────────────────────────────────────────
  getGraph: () => ipcRenderer.invoke("graph:get"),
  addNode: (title, parentTitle) => ipcRenderer.invoke("node:add", { title, parentTitle }),
  updateNode: (nodeId, description) => ipcRenderer.invoke("node:update", { nodeId, description }),

  // ── Template → Knowledge Tree ─────────────────────────────────────────────
  template: {
    /**
     * Upload a study document and build a knowledge tree from it.
     * @param {ArrayBuffer} buffer   - raw file bytes
     * @param {string}      name     - original filename
     * @param {string}      type     - MIME type
     * @returns {Promise<{ subject, nodes, edges, graph }>}
     */
    buildTree: (buffer, name, type) =>
      ipcRenderer.invoke("template:build", { buffer, name, type }),
  },

  // ── Per-node AI (summary + quiz) ─────────────────────────────────────────
  node: {
    /**
     * Generate an AI summary for a knowledge-tree node.
     * @param {string} nodeId
     * @param {string} nodeLabel
     * @param {string} description
     * @returns {Promise<{ summary: string }>}
     */
    summary: (nodeId, nodeLabel, description) =>
      ipcRenderer.invoke("node:summary", { nodeId, nodeLabel, description }),

    /**
     * Generate AI multiple-choice quiz questions for a node.
     * @param {string} nodeId
     * @param {string} nodeLabel
     * @param {string} description
     * @returns {Promise<{ questions: Array }>}
     */
    quiz: (nodeId, nodeLabel, description) =>
      ipcRenderer.invoke("node:quiz", { nodeId, nodeLabel, description }),
  },

  // ── RAG Chatbot ────────────────────────────────────────────────────────────
  chat: {
    /**
     * Send a user message and receive a RAG-augmented response.
     * @param {string} message - the user's text
     * @param {Array}  history - array of { id, from, text } message objects
     * @returns {Promise<{ response: string, sources: string[] }>}
     */
    sendMessage: (message, history) =>
      ipcRenderer.invoke("chat:message", { message, history }),

    /**
     * Upload a file to the RAG knowledge base.
     * @param {ArrayBuffer} buffer   - raw file bytes
     * @param {string}      name     - original filename (used for mime + display)
     * @param {string}      type     - MIME type (e.g. "application/pdf")
     * @returns {Promise<{ status: string, filename: string, chunks: number, message: string }>}
     */
    uploadFile: (buffer, name, type) =>
      ipcRenderer.invoke("chat:upload", { buffer, name, type }),

    /**
     * Check whether the chatbot Python server is reachable.
     * @returns {Promise<{ status: string, pinecone_connected: boolean }>}
     */
    health: () => ipcRenderer.invoke("chat:health"),
  },
});
