"""
main.py — callable function API layer

Single entry point that ties node.py and KnowledgeTree.py together.
All state lives in the module-level _tree instance.
Call startup() once on app launch and shutdown() on app exit.
Every other function is safe to call at any time after startup().
"""

from datetime import datetime, timedelta
from KnowledgeTree import KnowledgeTree
from node import node

# ---------------------------------------------------------------------------
# Module-level state — one tree instance for the lifetime of the process
# ---------------------------------------------------------------------------

_tree = KnowledgeTree()


# ===========================================================================
# LIFECYCLE
# ===========================================================================

def startup():
    """
    Boot sequence — call once when the Electron app launches.

    Steps:
      1. Connect to SQLite (data/lockingang.db).
      2. Load every persisted node row: title, mastery, decay_rate,
         last_reviewed, fail_count, scheduled_quiz, notes list.
      3. Recreate node objects via add_node() and restore all fields.
      4. Reload edges from the edges table and wire them via add_edge().
      5. For every node, call n.load_faiss_index() to reload its FAISS
         index from data/faiss/{safe_title}.faiss into memory.
      6. Run a single pass of run_decay_cycle() so the urgency queue
         reflects real-time state from the moment the app opens.

    TODO: open SQLite connection (sqlite3.connect('data/lockingang.db'))
    TODO: CREATE TABLE IF NOT EXISTS for nodes and edges on first run
    TODO: SELECT * FROM nodes and recreate each node via add_node()
    TODO: SELECT * FROM edges and call add_edge() for each row
    TODO: call n.load_faiss_index() for every node in _tree.nodes
    TODO: call run_decay_cycle() after loading
    """
    pass


def shutdown():
    """
    Teardown — call once when the Electron app is about to close.

    Steps:
      1. Persist all node state to SQLite:
         upsert title, mastery, decay_rate, last_reviewed,
         fail_count, scheduled_quiz, notes (JSON-serialised list).
      2. Persist all edges to SQLite: parent_title, child_title, type.
      3. Call n.save_faiss_index() for every node so FAISS index files
         on disk are current.

    TODO: open SQLite connection
    TODO: upsert all nodes: INSERT OR REPLACE INTO nodes (...)
    TODO: upsert all edges: INSERT OR REPLACE INTO edges (...)
    TODO: call n.save_faiss_index() for every node in _tree.nodes
    """
    pass


def run_decay_cycle():
    """
    Hourly background job — mirrors PRD §8.

    The forgetting curve is computed in real-time by node.get_live_score(),
    so no scores need to be written. This job handles the side-effects:

      1. Scan every node's projected live score.
      2. If a node transitions from blue → yellow (score crosses 0.7):
         - Schedule a review session a few days out by computing the day
           the node will hit 0.3 and setting n.scheduled_quiz accordingly.
         - TODO: push a Google Calendar event via the Calendar API.
      3. If a node transitions from yellow → red (score crosses 0.3)
         OR n.scheduled_quiz is within 24 hours:
         - Ensure n.scheduled_quiz is set to today or tomorrow.
         - TODO: push a Google Calendar update.
      4. If a previously scheduled quiz has been cleared (node back to blue):
         - Set n.scheduled_quiz = None.
         - TODO: delete the Google Calendar event.
      5. Persist any scheduled_quiz changes to SQLite.
      6. Return a summary dict for logging.

    TODO: iterate _tree.nodes and check status transitions
    TODO: compute review dates using node.mastery and node.decay_rate
    TODO: set / clear node.scheduled_quiz based on status
    TODO: push / update / delete Google Calendar events via Calendar API
    TODO: persist scheduled_quiz changes to SQLite
    TODO: return {checked: int, newly_yellow: list, newly_red: list, cleared: list}
    """
    pass


# ===========================================================================
# NODE MANAGEMENT
# ===========================================================================

def add_node(title: str, decay_rate: float = 0.05) -> dict:
    """
    Create a new node in the tree and persist it.
    Returns the serialised node dict for the frontend to render.
    """
    n = _tree.add_node(title, decay_rate)
    _persist_node(n)
    return _serialise_node(n)


def remove_node(title: str):
    """
    Delete a node, clean up its FAISS index files, and remove it from SQLite.
    Also removes all edges pointing to/from it (handled by KnowledgeTree).
    """
    _tree.remove_node(title)
    _delete_node_from_db(title)


def get_node_info(title: str) -> dict:
    """Return a full serialised snapshot of a single node for the detail panel."""
    n = _tree.get_node(title)
    return _serialise_node(n)


def list_all_nodes() -> list[dict]:
    """Return a lightweight list of all nodes for the graph renderer."""
    return [_serialise_node(n) for n in _tree.nodes.values()]


def rename_node(old_title: str, new_title: str) -> dict:
    """
    Rename a node.
    Removes the old node, creates a new one with transferred state,
    rewires all edges, and migrates the FAISS index file.

    TODO: copy all fields (mastery, decay_rate, notes, quiz_history, etc.) to new node
    TODO: rewire parent/child edges to the new node object
    TODO: rename FAISS index files on disk (old safe_title → new safe_title)
    TODO: update SQLite rows
    """
    pass


# ===========================================================================
# EDGE MANAGEMENT
# ===========================================================================

def add_edge(parent_title: str, child_title: str, relationship: str = "related_to"):
    """
    Add a directed edge between two existing nodes and persist it.
    relationship: 'requires' | 'is_a_type_of' | 'related_to' | 'bridges_to'
    """
    _tree.add_edge(parent_title, child_title, relationship)
    _persist_edge(parent_title, child_title, relationship)


def remove_edge(parent_title: str, child_title: str):
    """Remove a directed edge and delete it from SQLite."""
    _tree.remove_edge(parent_title, child_title)
    _delete_edge_from_db(parent_title, child_title)


def get_edges(title: str) -> dict:
    """
    Return all inbound and outbound edges for a node.
    Used by the detail panel and graph renderer.
    """
    n = _tree.get_node(title)
    return {
        "outbound": [{"target": e["target"].title, "type": e["type"]} for e in n.edges],
        "inbound": [{"source": p.title} for p in n.parents],
    }


# ===========================================================================
# NOTE INGESTION
# ===========================================================================

def upload_notes(node_title: str, file_path: str, file_type: str = "markdown"):
    """
    Attach and index a note file to a node.
    Delegates to node.upload_notes() which handles extraction, chunking,
    embedding, and FAISS indexing. Then persists the updated notes list.
    """
    n = _tree.get_node(node_title)
    n.upload_notes(file_path, file_type)
    _persist_node(n)


def get_notes(node_title: str) -> list[str]:
    """Return the list of note file paths / text attached to a node."""
    return _tree.get_node(node_title).notes


def delete_note(node_title: str, file_path: str):
    """
    Remove a note attachment from a node.
    Does NOT remove the corresponding vectors from the FAISS index —
    FAISS does not support deletion; the index must be rebuilt.

    TODO: remove file_path from n.notes
    TODO: rebuild the FAISS index by re-uploading all remaining notes:
          call n.delete_faiss_index(), then call n.upload_notes() for each
          remaining entry in n.notes.
    TODO: persist changes to SQLite
    """
    pass


# ===========================================================================
# QUIZ FLOW
# ===========================================================================

def get_quiz(node_title: str) -> list[dict]:
    """
    Generate and return quiz questions for a node.
    Delegates to node.gen_quiz() (Kahoot search → RAG fallback).
    Returns a list of {question, options, answer, explanation} dicts.
    """
    return _tree.get_node(node_title).gen_quiz()


def submit_answer(node_title: str, correct: bool) -> dict:
    """
    Record a quiz answer and run the full post-quiz orchestration loop.

    Steps:
      1. Update the node's mastery score (correct → 1.0, incorrect → 0.2).
      2. Check for Wall Detection: if node.is_wall() AND any parent's
         live score > 0.7, automatically generate a bridge node.
      3. After bridge generation, check if a grandparent reset is needed:
         if the bridge node already exists (repeated wall) escalate to
         trigger_grandparent_reset().
      4. Recompute and update node.scheduled_quiz based on new mastery.
      5. Persist the updated node to SQLite.
      6. Return a result dict describing what happened.

    Returns:
      {
        new_mastery: float,
        status: 'blue' | 'yellow' | 'red',
        wall_detected: bool,
        bridge_created: str | None,   # bridge node title if created
        grandparent_reset: bool,
        next_review: str | None,      # ISO datetime of next scheduled quiz
      }
    """
    n = _tree.get_node(node_title)
    new_score = n.update_score(correct)

    bridge_created = None
    grandparent_reset = False
    wall_detected = False

    if n.is_wall():
        walls = _tree.detect_walls()
        matching = [w for w in walls if w["child"] is n]
        if matching:
            wall_detected = True
            parent = matching[0]["parent"]
            bridge_title = f"Bridge: {parent.title} → {node_title}"

            if bridge_title not in _tree.nodes:
                bridge = _tree.generate_bridge_node(parent.title, node_title)
                bridge_created = bridge.title
                _persist_node(bridge)
            else:
                # Bridge already exists — escalate to grandparent reset
                _tree.trigger_grandparent_reset(node_title)
                grandparent_reset = True
                for gp in _tree.get_ancestors(node_title):
                    _persist_node(gp)

    _update_scheduled_quiz(n)
    _persist_node(n)

    return {
        "new_mastery": new_score,
        "status": n.get_status(),
        "wall_detected": wall_detected,
        "bridge_created": bridge_created,
        "grandparent_reset": grandparent_reset,
        "next_review": n.scheduled_quiz.isoformat() if n.scheduled_quiz else None,
    }


# ===========================================================================
# AI GENERATION
# ===========================================================================

def get_summary(node_title: str) -> str:
    """
    Generate and return a markdown summary of a node's concept.
    Delegates to node.gen_summary() which queries FAISS + OpenAI.
    """
    return _tree.get_node(node_title).gen_summary()


def ask_question(node_title: str, context: str = "") -> dict:
    """
    Generate an active-recall or remediation question for a node.
    context = ""  → standard question
    context = str → remediation question targeting the mistake in context
    Returns {question, hint, node_title}.
    """
    return _tree.get_node(node_title).ask_qn(context)


# ===========================================================================
# DASHBOARD
# ===========================================================================

def get_session_briefing() -> dict:
    """
    Full dashboard snapshot — single call for the frontend to hydrate the
    dashboard on load. Returns urgency queue, distribution, walls, average
    mastery, due today list, trend, and 7-day forecast.
    """
    briefing = _tree.get_session_briefing()
    briefing["trend"] = _tree.get_trend_analysis()
    briefing["forecast"] = _tree.get_forgetting_forecast(days=7)
    return briefing


def get_urgency_queue(limit: int = 10) -> list[dict]:
    """Top N nodes most in need of review, serialised for the task list."""
    return [_serialise_node(n) for n in _tree.get_urgency_queue(limit)]


def get_forgetting_forecast(days: int = 7) -> dict:
    """7-day heatmap data: {day_1: [titles], ..., day_7: [titles]}."""
    return _tree.get_forgetting_forecast(days)


def get_fog_of_war() -> list[str]:
    """Titles of nodes below 0.3 mastery — the UI dims these."""
    return [n.title for n in _tree.get_fog_of_war_nodes()]


def get_mastery_distribution() -> dict:
    """Count of blue / yellow / red nodes for the overview chart."""
    return _tree.get_mastery_distribution()


def get_trend_analysis() -> dict:
    """{'trend': 'improving'|'regressing'|'stable', 'delta': float}"""
    return _tree.get_trend_analysis()


def get_nodes_by_status(status: str) -> list[dict]:
    """Filter and serialise nodes by 'blue' | 'yellow' | 'red'."""
    return [_serialise_node(n) for n in _tree.get_nodes_by_status(status)]


# ===========================================================================
# SCHEDULING
# ===========================================================================

def get_review_schedule() -> list[dict]:
    """
    Ordered list of upcoming review sessions with projected decay scores.
    Each entry: {node_title, review_by, projected_score}.
    """
    return _tree.get_review_schedule()


def get_nodes_due_today() -> list[str]:
    """Titles of nodes whose scheduled quiz is today — rendered red in UI."""
    return [n.title for n in _tree.get_nodes_due_today()]


def reschedule_quiz(node_title: str, new_datetime: datetime):
    """
    Manually reschedule a node's quiz (e.g. drag-and-drop in calendar — PRD §3.6).
    Validates the new date is within the 1-week window then persists.
    """
    max_date = datetime.now() + timedelta(weeks=1)
    if new_datetime > max_date:
        raise ValueError("Review blocks can only be rescheduled within a 1-week window.")
    n = _tree.get_node(node_title)
    n.scheduled_quiz = new_datetime
    _persist_node(n)
    # TODO: update the Google Calendar event for this node via Calendar API


def clear_scheduled_quiz(node_title: str):
    """Mark a scheduled quiz as completed — node returns to blue, calendar event removed."""
    n = _tree.get_node(node_title)
    n.scheduled_quiz = None
    _persist_node(n)
    # TODO: delete the Google Calendar event for this node via Calendar API


# ===========================================================================
# ADAPTIVE LOGIC
# ===========================================================================

def check_walls() -> list[dict]:
    """
    Return all active Wall situations.
    Each entry: {parent: str, child: str}.
    Called by the UI to show wall indicators on nodes.
    """
    return [
        {"parent": w["parent"].title, "child": w["child"].title}
        for w in _tree.detect_walls()
    ]


def create_bridge(parent_title: str, child_title: str) -> str:
    """
    Manually trigger bridge node generation (e.g. from right-click menu — PRD §3.1).
    Returns the bridge node title.
    """
    bridge = _tree.generate_bridge_node(parent_title, child_title)
    _persist_node(bridge)
    _persist_edge(parent_title, bridge.title, "bridges_to")
    _persist_edge(bridge.title, child_title, "bridges_to")
    return bridge.title


def reset_grandparent(child_title: str):
    """
    Manually trigger a grandparent reset (e.g. from right-click menu — PRD §3.1).
    Resets grandparent mastery to 0.0 and persists.
    """
    _tree.trigger_grandparent_reset(child_title)
    for n in _tree.get_ancestors(child_title):
        _persist_node(n)


def get_diamond_nodes() -> list[str]:
    """Return titles of nodes with 2+ parents — synthesis quiz candidates."""
    return [n.title for n in _tree.detect_diamond_problems()]


# ===========================================================================
# GRAPH QUERIES
# ===========================================================================

def get_critical_path(target_title: str) -> list[str]:
    """Ordered prerequisite chain (requires edges only) leading to the target."""
    return [n.title for n in _tree.get_critical_path(target_title)]


def get_weakest_prerequisites(target_title: str) -> list[dict]:
    """Prerequisite nodes below 0.7 mastery blocking progress to target."""
    return [_serialise_node(n) for n in _tree.get_weakest_prerequisites(target_title)]


def get_ancestors(title: str) -> list[str]:
    """All ancestor node titles (BFS)."""
    return [n.title for n in _tree.get_ancestors(title)]


def get_descendants(title: str) -> list[str]:
    """All descendant node titles (BFS)."""
    return [n.title for n in _tree.get_descendants(title)]


def get_root_nodes() -> list[str]:
    """Titles of nodes with no parents — tree entry points."""
    return [n.title for n in _tree.get_root_nodes()]


# ===========================================================================
# IMPORT / EXPORT
# ===========================================================================

def export_template() -> dict:
    """
    Serialise the full tree to a portable dict for community sharing (PRD §3.5).
    Strip mastery/quiz_history — templates contain only structure and notes.
    """
    return _tree.export_as_template()


def import_template(template: dict):
    """
    Rebuild the tree from a community template dict (PRD §3.5).
    Persists all new nodes and edges to SQLite.
    """
    _tree.import_from_template(template)
    for n in _tree.nodes.values():
        _persist_node(n)
    for title, n in _tree.nodes.items():
        for edge in n.edges:
            _persist_edge(title, edge["target"].title, edge["type"])


def ingest_content(file_path: str, source_type: str = "markdown"):
    """
    Run the full AI content ingestion pipeline (PRD §5).
    Extracts concepts, builds the tree, indexes everything in FAISS,
    and returns the tree in 'pending_review' state for student confirmation.
    The caller must invoke confirm_ingest() after the student approves the tree.
    """
    return _tree.import_from_ai_generation(file_path, source_type)


def confirm_ingest():
    """
    Commit a pending ingestion to SQLite after student review.
    Call this after ingest_content() once the student has approved the generated tree.
    """
    for n in _tree.nodes.values():
        _persist_node(n)
    for title, n in _tree.nodes.items():
        for edge in n.edges:
            _persist_edge(title, edge["target"].title, edge["type"])


# ===========================================================================
# INTERNAL HELPERS  (prefixed _ — not part of the public API)
# ===========================================================================

def _serialise_node(n: node) -> dict:
    """Convert a node object to a plain dict safe to send to the frontend."""
    return {
        "title": n.title,
        "mastery": n.mastery,
        "live_score": n.get_live_score(),
        "status": n.get_status(),
        "decay_rate": n.decay_rate,
        "last_reviewed": n.last_reviewed.isoformat(),
        "notes": n.notes,
        "fail_count": n.fail_count,
        "scheduled_quiz": n.scheduled_quiz.isoformat() if n.scheduled_quiz else None,
        "quiz_history": n.quiz_history,
        "children": [c.title for c in n.children],
        "parents": [p.title for p in n.parents],
        "edges": [{"target": e["target"].title, "type": e["type"]} for e in n.edges],
        "faiss_vectors": n.faiss_index.ntotal if n.faiss_index else 0,
    }


def _update_scheduled_quiz(n: node):
    """
    Recompute when this node will hit 0.3 mastery and set scheduled_quiz.
    Clears it if the node is already blue (live score > 0.7).
    """
    if n.get_live_score() > 0.7:
        n.scheduled_quiz = None
        return
    for day in range(1, 31):
        projected = n.mastery * ((1 - n.decay_rate) ** day)
        if projected < 0.3:
            n.scheduled_quiz = n.last_reviewed + timedelta(days=day)
            return
    n.scheduled_quiz = None


def _persist_node(n: node):
    """
    Upsert a node's state to SQLite.
    TODO: INSERT OR REPLACE INTO nodes
          (title, mastery, decay_rate, last_reviewed, fail_count,
           scheduled_quiz, notes_json)
          VALUES (?, ?, ?, ?, ?, ?, ?)
    """
    pass


def _delete_node_from_db(title: str):
    """
    Remove a node and all its edges from SQLite.
    TODO: DELETE FROM nodes WHERE title = ?
    TODO: DELETE FROM edges WHERE parent_title = ? OR child_title = ?
    """
    pass


def _persist_edge(parent_title: str, child_title: str, relationship: str):
    """
    Upsert an edge to SQLite.
    TODO: INSERT OR REPLACE INTO edges (parent_title, child_title, type)
          VALUES (?, ?, ?)
    """
    pass


def _delete_edge_from_db(parent_title: str, child_title: str):
    """
    Remove an edge from SQLite.
    TODO: DELETE FROM edges WHERE parent_title = ? AND child_title = ?
    """
    pass
