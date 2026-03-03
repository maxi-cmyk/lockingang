// Lightweight reactive node store.
// Loads from Python backend on init. Starts empty if backend unavailable.

// ── Format adapter ────────────────────────────────────────────────────────
// Backend shape: { nodes: [...], edges: [...] }
// Each node: { id, label, type, icon, status, position:{x,y}, payload }
// Each edge: { from, to, type, status }
function adaptBackendData({ nodes: rawNodes, edges: rawEdges }) {
    const outboundEdges = {};
    (rawEdges || []).forEach(({ from, to }) => {
        if (!outboundEdges[from]) outboundEdges[from] = [];
        outboundEdges[from].push(to);
    });

    return (rawNodes || []).map((n) => ({
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
}

// ── State ─────────────────────────────────────────────────────────────────
let nodes = [];
let listeners = [];

// ── Public API ────────────────────────────────────────────────────────────
export const getNodes = () => nodes;

// Called by MissionCompleteScreen after AddNode returns the updated graph
export const adaptAndReloadNodes = (backendGraphResponse) => {
    nodes = adaptBackendData(backendGraphResponse);
    listeners.forEach((fn) => fn(nodes));
};

// Call once when VectorGraphScreen mounts — tries Python IPC.
// Keeps empty if backend is not running.
export const initNodes = async () => {
    if (typeof window !== "undefined" && window.api?.getGraph) {
        try {
            const data = await window.api.getGraph();
            if (data && (data.nodes?.length || 0) > 0) {
                nodes = adaptBackendData(data);
                listeners.forEach((fn) => fn(nodes));
                console.log("[nodeStore] Loaded from backend:", nodes.length, "nodes");
            } else {
                console.info("[nodeStore] Backend returned empty graph — starting fresh.");
            }
        } catch (err) {
            console.warn("[nodeStore] Backend unavailable:", err.message);
        }
    }
};

export const addNode = ({ label, data, connectedToId }) => {
    const angle = Math.random() * 2 * Math.PI;
    const radius = 18 + Math.random() * 10;
    const id = label.toUpperCase().replace(/\s+/g, "_").slice(0, 30);
    const newNode = {
        id,
        label: id,
        icon: "description",
        x: 50 + Math.cos(angle) * radius,
        y: 50 + Math.sin(angle) * radius,
        isPrimary: nodes.length === 0,
        status: "active",
        mastery: null,
        data: data || "",
        connectedTo: connectedToId ? [connectedToId] : [],
    };
    nodes = [...nodes, newNode];
    listeners.forEach((fn) => fn(nodes));
    return newNode;
};

export const deleteNodeById = (nodeId) => {
    nodes = nodes
        .filter((n) => n.id !== nodeId)
        .map((n) => ({
            ...n,
            connectedTo: (n.connectedTo || []).filter((id) => id !== nodeId),
        }));
    listeners.forEach((fn) => fn(nodes));
};

export const updateNodeInStore = (nodeId, updates) => {
    nodes = nodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n));
    listeners.forEach((fn) => fn(nodes));
};

// Load a full tree result (from TemplateScreen) into the visual store
export const loadTreeIntoStore = (treeNodes, treeEdges) => {
    const outbound = {};
    (treeEdges || []).forEach(({ parent, child }) => {
        if (!outbound[parent]) outbound[parent] = [];
        outbound[parent].push(child);
    });

    const W = 800;
    const H = 600;
    nodes = (treeNodes || []).map((n, i) => {
        const angle = (i / treeNodes.length) * 2 * Math.PI;
        const r = i === 0 ? 0 : 35 + Math.random() * 15;
        return {
            id: n.title,
            label: n.title,
            icon: "blur_on",
            x: 50 + Math.cos(angle) * r,
            y: 50 + Math.sin(angle) * r,
            isPrimary: i === 0,
            status: "active",
            mastery: null,
            data: n.description || "",
            connectedTo: outbound[n.title] || [],
        };
    });
    listeners.forEach((fn) => fn(nodes));
};

export const subscribe = (fn) => {
    listeners.push(fn);
    return () => {
        listeners = listeners.filter((l) => l !== fn);
    };
};
