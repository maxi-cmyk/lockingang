// Lightweight reactive node store.
// Tries window.api.getGraph() (Electron IPC → Python backend) first.
// Falls back to local dummyGraph.json if the backend is unavailable.
import dummyData from "./data/dummyGraph.json";

// ── Format adapter ────────────────────────────────────────────────────────
// Both the real backend and dummyGraph.json use the same shape:
//   { nodes: [...], edges: [...] }
// where each node has: id, label, type, icon, status, position:{x,y}, payload
// and each edge has: from, to, type, status
//
// We convert to the internal "flat" shape used by KnowledgeTreeScreen.
function adaptBackendData({ nodes: rawNodes, edges: rawEdges }) {
    // Build a connectedTo map from the separate edges array
    const outboundEdges = {};
    (rawEdges || []).forEach(({ from, to }) => {
        if (!outboundEdges[from]) outboundEdges[from] = [];
        outboundEdges[from].push(to);
    });

    const nodes = rawNodes.map((n) => ({
        id: n.id,
        label: n.label,
        icon: n.icon || "blur_on",
        x: n.position?.x ?? 50,
        y: n.position?.y ?? 50,
        isPrimary: n.type === "primary",
        status: n.status || "active",
        mastery: n.mastery ?? null,
        data: n.payload?.description || "",
        connectedTo: outboundEdges[n.id] || [],
    }));

    return nodes;
}

// ── Initial state (dummy fallback) ────────────────────────────────────────
let nodes = adaptBackendData(dummyData);
let listeners = [];

// ── Public API ────────────────────────────────────────────────────────────
export const getNodes = () => nodes;

// Called by MissionCompleteScreen after AddNode returns the updated graph
export const adaptAndReloadNodes = (backendGraphResponse) => {
    nodes = adaptBackendData(backendGraphResponse);
    listeners.forEach((fn) => fn(nodes));
};

// Call this once when KnowledgeTreeScreen mounts.
// It will try to reach the Python backend via Electron IPC.
// If the backend is not running, it silently keeps the dummy data.
export const initNodes = async () => {
    if (typeof window !== "undefined" && window.api?.getGraph) {
        try {
            const data = await window.api.getGraph();
            nodes = adaptBackendData(data);
            listeners.forEach((fn) => fn(nodes));
            console.log("[nodeStore] Loaded from Python backend:", nodes.length, "nodes");
        } catch (err) {
            console.warn("[nodeStore] Backend unavailable — using dummy data.", err.message);
        }
    } else {
        console.info("[nodeStore] window.api not found (not in Electron?) — using dummy data.");
    }
};

export const addNode = ({ label, data, connectedToId }) => {
    const angle = Math.random() * 2 * Math.PI;
    const radius = 18 + Math.random() * 10;
    const newNode = {
        id: `node_${Date.now()}`,
        label: label.toUpperCase().replace(/\s+/g, "_").slice(0, 20),
        icon: "description",
        x: 50 + Math.cos(angle) * radius,
        y: 50 + Math.sin(angle) * radius,
        isPrimary: false,
        status: "active",
        data: data || "",
        connectedTo: connectedToId ? [connectedToId] : ["SYSTEM_CORE"],
    };
    nodes = [...nodes, newNode];
    listeners.forEach((fn) => fn(nodes));
    return newNode;
};

export const subscribe = (fn) => {
    listeners.push(fn);
    return () => {
        listeners = listeners.filter((l) => l !== fn);
    };
};
