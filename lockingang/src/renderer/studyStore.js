/**
 * studyStore.js — Central reactive store for study plan, mastery, and scheduling.
 *
 * Persists to localStorage under "lockingang_study".
 * All screens read from this store instead of hardcoded data.
 */

const STORE_KEY = "lockingang_study";

const DEFAULT_STATE = {
  subject: "",
  nodes: [],       // [{id, label, description, mastery, status, attachedFiles}]
  edges: [],       // [{parent, child, type}]
  schedule: {},    // {"YYYY-MM-DD": [{nodeId, nodeLabel, status}]}
  quizHistory: [], // [{nodeId, score, timestamp}]
};

// ── Persistence ──────────────────────────────────────────────────────────────

function _load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function _save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(_state));
  } catch {
    // Storage full or unavailable — silent fail
  }
}

// ── Reactive core ────────────────────────────────────────────────────────────

let _state = _load();
let _listeners = [];

function _notify() {
  _listeners.forEach((fn) => fn(_state));
}

export function subscribe(fn) {
  _listeners.push(fn);
  return () => {
    _listeners = _listeners.filter((l) => l !== fn);
  };
}

export function getState() {
  return _state;
}

// ── Tree initialisation ──────────────────────────────────────────────────────

/**
 * Called after TemplateScreen successfully builds a tree.
 * Resets the store and schedules 1 node per day starting today.
 * @param {{ subject: string, nodes: Array, edges: Array }} treeResult
 */
export function initFromTree({ subject, nodes, edges }) {
  const studyNodes = (nodes || []).map((n) => ({
    id: n.title,
    label: n.title,
    description: n.description || "",
    mastery: 0,
    status: "new",
    attachedFiles: [],
    testDate: null,
  }));

  _state = {
    subject: subject || "",
    nodes: studyNodes,
    edges: edges || [],
    schedule: {},
    quizHistory: [],
  };

  _buildStudyPlan();
  _save();
  _notify();
}

// ── Study plan builder ───────────────────────────────────────────────────────

function _buildStudyPlan() {
  const schedule = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  _state.nodes.forEach((node, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const key = _dateKey(d);
    if (!schedule[key]) schedule[key] = [];
    schedule[key].push({ nodeId: node.id, nodeLabel: node.label, status: "pending" });
  });

  _state = { ..._state, schedule };
}

export function rebuildStudyPlan() {
  _buildStudyPlan();
  _save();
  _notify();
}

// ── Mastery + quiz results ───────────────────────────────────────────────────

/**
 * Record a quiz result for a node and update its mastery score.
 * @param {string} nodeId
 * @param {number} score  0.0 – 1.0
 */
export function updateMastery(nodeId, score) {
  const clamped = Math.max(0, Math.min(1, score));
  const status =
    clamped >= 0.7 ? "mastered" : clamped >= 0.3 ? "active" : "critical";

  _state = {
    ..._state,
    nodes: _state.nodes.map((n) =>
      n.id === nodeId ? { ...n, mastery: clamped, status } : n
    ),
    quizHistory: [
      ..._state.quizHistory,
      { nodeId, score: clamped, timestamp: Date.now() },
    ],
  };
  _save();
  _notify();
}

/**
 * Reschedule a node to the first available day after the last scheduled date.
 * Called when a quiz score is below the pass threshold.
 * @param {string} nodeId
 */
export function rescheduleNode(nodeId) {
  const node = _state.nodes.find((n) => n.id === nodeId);
  if (!node) return;

  const allDates = Object.keys(_state.schedule).sort();
  const lastDate = allDates[allDates.length - 1];
  const next = lastDate ? new Date(lastDate) : new Date();
  next.setDate(next.getDate() + 1);
  const key = _dateKey(next);

  const newSchedule = { ..._state.schedule };
  if (!newSchedule[key]) newSchedule[key] = [];
  newSchedule[key].push({
    nodeId,
    nodeLabel: node.label,
    status: "rescheduled",
  });

  _state = { ..._state, schedule: newSchedule };
  _save();
  _notify();
}

// ── Node CRUD ────────────────────────────────────────────────────────────────

export function updateNodeDescription(nodeId, description) {
  _state = {
    ..._state,
    nodes: _state.nodes.map((n) =>
      n.id === nodeId ? { ...n, description } : n
    ),
  };
  _save();
  _notify();
}

export function renameNode(nodeId, newLabel) {
  _state = {
    ..._state,
    nodes: _state.nodes.map((n) =>
      n.id === nodeId ? { ...n, label: newLabel } : n
    ),
  };
  _save();
  _notify();
}

export function deleteStudyNode(nodeId) {
  _state = {
    ..._state,
    nodes: _state.nodes.filter((n) => n.id !== nodeId),
    edges: _state.edges.filter(
      (e) => e.parent !== nodeId && e.child !== nodeId
    ),
    schedule: Object.fromEntries(
      Object.entries(_state.schedule).map(([date, blocks]) => [
        date,
        blocks.filter((b) => b.nodeId !== nodeId),
      ])
    ),
  };
  _save();
  _notify();
}

export function addStudyNode(label, description = "") {
  const id = label.toUpperCase().replace(/\s+/g, "_");
  if (_state.nodes.find((n) => n.id === id)) return; // already exists

  const newNode = {
    id,
    label,
    description,
    mastery: 0,
    status: "new",
    attachedFiles: [],
    testDate: null,
  };

  // Schedule it for today
  const key = _dateKey(new Date());
  const newSchedule = { ..._state.schedule };
  if (!newSchedule[key]) newSchedule[key] = [];
  newSchedule[key].push({ nodeId: id, nodeLabel: label, status: "pending" });

  _state = {
    ..._state,
    nodes: [..._state.nodes, newNode],
    schedule: newSchedule,
  };
  _save();
  _notify();
}

export function setTestDate(nodeId, dateStr) {
  _state = {
    ..._state,
    nodes: _state.nodes.map((n) =>
      n.id === nodeId ? { ...n, testDate: dateStr || null } : n
    ),
  };
  _save();
  _notify();
}

export function attachFileToNode(nodeId, filename) {
  _state = {
    ..._state,
    nodes: _state.nodes.map((n) =>
      n.id === nodeId
        ? { ...n, attachedFiles: [...(n.attachedFiles || []), filename] }
        : n
    ),
  };
  _save();
  _notify();
}

// ── Query helpers ────────────────────────────────────────────────────────────

export function getNodeById(nodeId) {
  return _state.nodes.find((n) => n.id === nodeId) || null;
}

export function getTodaySchedule() {
  const key = _dateKey(new Date());
  return _state.schedule[key] || [];
}

export function getScheduleForDate(dateStr) {
  return _state.schedule[dateStr] || [];
}

export function getDaysToTest(node) {
  if (!node?.testDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const testD = new Date(node.testDate);
  testD.setHours(0, 0, 0, 0);
  return Math.ceil((testD - today) / (1000 * 60 * 60 * 24));
}

export function getUrgencyQueue(limit = 5) {
  return [..._state.nodes]
    .map((n) => {
      const days = getDaysToTest(n);
      // testPriority: higher = more urgent. Overdue=1000, <=2d=500, <=7d=200, <=14d=100, no test=0
      let testPriority = 0;
      if (days !== null) {
        if (days <= 0)  testPriority = 1000;
        else if (days <= 2) testPriority = 500;
        else if (days <= 7) testPriority = 200;
        else if (days <= 14) testPriority = 100;
        else testPriority = 50;
      }
      return { ...n, _testPriority: testPriority, _daysToTest: days };
    })
    .filter((n) => n.mastery < 0.7 || n._testPriority > 0)
    .sort((a, b) => {
      if (b._testPriority !== a._testPriority) return b._testPriority - a._testPriority;
      return a.mastery - b.mastery;
    })
    .slice(0, limit);
}

export function getMasteryStats() {
  const total = _state.nodes.length;
  if (total === 0) return { total: 0, mastered: 0, inProgress: 0, critical: 0 };
  const mastered = _state.nodes.filter((n) => n.mastery >= 0.7).length;
  const critical = _state.nodes.filter((n) => n.mastery > 0 && n.mastery < 0.3).length;
  const inProgress = total - mastered - critical;
  return { total, mastered, inProgress, critical };
}

// ── Utilities ────────────────────────────────────────────────────────────────

function _dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
