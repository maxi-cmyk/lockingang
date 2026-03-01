from datetime import datetime, timedelta
from node import node


class KnowledgeTree:
    def __init__(self):
        self.nodes: dict[str, node] = {}  # title -> node

    # ------------------------------------------------------------------
    # Node & edge management
    # ------------------------------------------------------------------

    def add_node(self, title: str, decay_rate: float = 0.05) -> node:
        """Add a new node to the tree."""
        if title in self.nodes:
            raise ValueError(f"Node '{title}' already exists.")
        n = node(title, decay_rate)
        self.nodes[title] = n
        return n

    def remove_node(self, title: str):
        """Remove a node, detach it from all edges, and delete its FAISS index files."""
        if title not in self.nodes:
            raise KeyError(f"Node '{title}' not found.")
        target = self.nodes[title]
        target.delete_faiss_index()  # clean up {safe_title}.faiss + _chunks.json from disk
        for n in self.nodes.values():
            n.children = [c for c in n.children if c is not target]
            n.edges = [e for e in n.edges if e["target"] is not target]
            n.parents = [p for p in n.parents if p is not target]
        del self.nodes[title]

    def get_node(self, title: str) -> node:
        if title not in self.nodes:
            raise KeyError(f"Node '{title}' not found.")
        return self.nodes[title]

    def add_edge(self, parent_title: str, child_title: str, relationship: str = "related_to"):
        """Create a directed relationship between two existing nodes."""
        parent = self.get_node(parent_title)
        child = self.get_node(child_title)
        parent.set_child(child, relationship)

    def remove_edge(self, parent_title: str, child_title: str):
        """Remove a directed edge between two nodes."""
        parent = self.get_node(parent_title)
        child = self.get_node(child_title)
        parent.children = [c for c in parent.children if c is not child]
        parent.edges = [e for e in parent.edges if e["target"] is not child]
        child.parents = [p for p in child.parents if p is not parent]

    # ------------------------------------------------------------------
    # Graph traversal
    # ------------------------------------------------------------------

    def get_parents(self, title: str) -> list[node]:
        """All nodes that have the given node as a direct child."""
        target = self.get_node(title)
        return target.parents

    def get_ancestors(self, title: str) -> list[node]:
        """All ancestors via BFS (used for grandparent reset path)."""
        visited, queue = set(), [title]
        while queue:
            current = queue.pop(0)
            for parent in self.get_parents(current):
                if parent.title not in visited:
                    visited.add(parent.title)
                    queue.append(parent.title)
        return [self.nodes[t] for t in visited]

    def get_descendants(self, title: str) -> list[node]:
        """All descendants via BFS."""
        visited, queue = set(), [self.get_node(title)]
        while queue:
            current = queue.pop(0)
            for child in current.children:
                if child.title not in visited:
                    visited.add(child.title)
                    queue.append(child)
        return [self.nodes[t] for t in visited]

    def get_root_nodes(self) -> list[node]:
        """Nodes with no parents — entry points of the tree."""
        return [n for n in self.nodes.values() if not self.get_parents(n.title)]

    def get_critical_path(self, target_title: str) -> list[node]:
        """
        Ordered prerequisite chain leading to the target node.
        Follows 'requires' edges only (PRD §3.1).
        """
        path, visited = [], set()

        def dfs(title):
            if title in visited:
                return
            visited.add(title)
            for parent in self.get_parents(title):
                edge = next((e for e in parent.edges if e["target"] is self.nodes[title]), None)
                if edge and edge["type"] == "requires":
                    dfs(parent.title)
            path.append(self.nodes[title])

        dfs(target_title)
        return path

    # ------------------------------------------------------------------
    # Mastery & decay queries
    # ------------------------------------------------------------------

    def get_urgency_queue(self, n: int = 10) -> list[node]:
        """Top N nodes most in need of review, sorted by live score ascending (PRD §3.2)."""
        return sorted(self.nodes.values(), key=lambda nd: nd.get_live_score())[:n]

    def get_nodes_by_status(self, status: str) -> list[node]:
        """Filter nodes by color status: 'blue' | 'yellow' | 'red'."""
        return [n for n in self.nodes.values() if n.get_status() == status]

    def get_fog_of_war_nodes(self) -> list[node]:
        """Nodes below 0.3 mastery — visually dimmed in the UI (PRD §3.1)."""
        return [n for n in self.nodes.values() if n.get_live_score() < 0.3]

    def get_mastery_distribution(self) -> dict:
        """Count of nodes in each status tier for the dashboard mastery overview."""
        return {
            "blue": len(self.get_nodes_by_status("blue")),
            "yellow": len(self.get_nodes_by_status("yellow")),
            "red": len(self.get_nodes_by_status("red")),
            "total": len(self.nodes),
        }

    def get_forgetting_forecast(self, days: int = 7) -> dict[str, list[str]]:
        """
        Project which nodes will decay below 0.3 within the next N days.
        Returns a dict mapping each day offset ('day_1' … 'day_N') to a list of node titles.
        PRD §3.1 / §8.
        """
        forecast = {}
        for day in range(1, days + 1):
            future_time = datetime.now() + timedelta(days=day)
            will_decay = []
            for n in self.nodes.values():
                elapsed = (future_time - n.last_reviewed).total_seconds() / 86400
                projected = n.mastery * (0.5 ** (elapsed / n.decay_rate))
                if projected < 0.3:
                    will_decay.append(n.title)
            forecast[f"day_{day}"] = will_decay
        return forecast

    def get_weakest_prerequisites(self, target_title: str) -> list[node]:
        """Prerequisite nodes on the critical path that are currently below 0.7 mastery."""
        path = self.get_critical_path(target_title)
        return [n for n in path if n.get_live_score() < 0.7 and n.title != target_title]

    def get_average_mastery(self) -> float:
        """Mean live score across all nodes."""
        if not self.nodes:
            return 0.0
        total = sum(n.get_live_score() for n in self.nodes.values())
        return round(total / len(self.nodes), 4)

    # ------------------------------------------------------------------
    # Adaptive logic (PRD §7)
    # ------------------------------------------------------------------

    def detect_walls(self) -> list[dict]:
        """
        Find all Wall situations: a child has failed 3+ times while its
        parent still shows mastery > 0.7 (PRD §7).
        Returns list of {parent, child} dicts.
        """
        walls = []
        for n in self.nodes.values():
            if n.is_wall():
                for parent in self.get_parents(n.title):
                    if parent.get_live_score() > 0.7:
                        walls.append({"parent": parent, "child": n})
        return walls

    def generate_bridge_node(self, parent_title: str, child_title: str) -> node:
        """
        Insert an AI-generated bridge node between a parent and a difficult child (PRD §7).
        Wires: parent -> bridge (bridges_to) -> child (bridges_to).
        TODO: call OpenAI to generate introductory bridge content.
        """
        bridge_title = f"Bridge: {parent_title} → {child_title}"
        bridge = self.add_node(bridge_title, decay_rate=0.03)
        self.remove_edge(parent_title, child_title)
        self.add_edge(parent_title, bridge_title, "bridges_to")
        self.add_edge(bridge_title, child_title, "bridges_to")

        import numpy as np
        import requests

        response = requests.post(
            "http://localhost:5001/embed",
            json={"text": parent_title},
            timeout=10,
        )
        response.raise_for_status()
        vector = response.json().get("vector")
        if not isinstance(vector, list) or not vector:
            raise ValueError("Embedding service returned an invalid vector for parent_title.")

        parent_vec = np.array([vector], dtype=np.float32)
        norm = np.linalg.norm(parent_vec)
        if norm == 0.0:
            raise ValueError("Embedding service returned a zero vector for parent_title.")
        parent_vec /= norm

        parent_chunks = self.get_node(parent_title).search_faiss(parent_vec, k=4)
        # TODO: do the same for child_title: embed + normalise + child.search_faiss(vec, k=4).
        # TODO: call OpenAI with both chunk sets + prompt:
        #         "A student has mastered '{parent_title}' but repeatedly fails '{child_title}'.
        #          Write a short introductory markdown note (300–500 words) that bridges the gap.
        #          Focus on the concepts in '{parent_title}' that most directly unlock '{child_title}'.
        #          Use simple language, an analogy, and 2–3 worked examples."
        # TODO: write the returned markdown to a temp file and call bridge.upload_notes()
        #       so the content is chunked, embedded, and indexed into the bridge node's
        #       own NEW FAISS index (stored at data/faiss/{safe_bridge_title}.faiss).
        # TODO: optionally auto-schedule the bridge node as the student's next review
        #       item by setting bridge.scheduled_quiz = datetime.now() + timedelta(hours=1)
        #       and inserting a Google Calendar event via the calendar integration.
        return bridge

    def trigger_grandparent_reset(self, child_title: str):
        """
        Escalation when a Wall persists: reset the grandparent's mastery to 0.0,
        forcing review of fundamentals (PRD §7).
        """
        for parent in self.get_parents(child_title):
            for gp in self.get_parents(parent.title):
                gp.mastery = 0.0
                gp.last_reviewed = datetime.now()
                gp.quiz_history.append({
                    "timestamp": datetime.now().isoformat(),
                    "score": 0.0,
                    "correct": False,
                    "reason": "grandparent_reset",
                })

    def detect_diamond_problems(self) -> list[node]:
        """
        Nodes with 2+ parents — candidates for synthesis quizzes (PRD §4).
        """
        return [n for n in self.nodes.values() if len(self.get_parents(n.title)) >= 2]

    # ------------------------------------------------------------------
    # Scheduling helpers (PRD §6)
    # ------------------------------------------------------------------

    def get_review_schedule(self) -> list[dict]:
        """
        For each node, find the day it will hit 0.3 and recommend a review by then.
        Returns list of {node_title, review_by, projected_score} sorted by urgency.
        """
        schedule = []
        for n in self.nodes.values():
            if n.mastery == 0.0:
                continue
            for day in range(1, 31):
                projected = n.mastery * (0.5 ** (day / n.decay_rate))
                if projected < 0.3:
                    review_by = n.last_reviewed + timedelta(days=day)
                    schedule.append({
                        "node_title": n.title,
                        "review_by": review_by.isoformat(),
                        "projected_score": round(projected, 4),
                    })
                    break
        return sorted(schedule, key=lambda x: x["review_by"])

    def get_nodes_due_today(self) -> list[node]:
        """Nodes whose scheduled_quiz falls on today — shown as red in the UI (PRD §3.6)."""
        today = datetime.now().date()
        return [
            n for n in self.nodes.values()
            if n.scheduled_quiz and n.scheduled_quiz.date() == today
        ]

    # ------------------------------------------------------------------
    # Dashboard analytics (PRD §3.2)
    # ------------------------------------------------------------------

    def get_session_briefing(self) -> dict:
        """
        Summary snapshot for the dashboard: urgency queue, mastery distribution,
        walls, average mastery, and today's due nodes.
        """
        return {
            "average_mastery": self.get_average_mastery(),
            "distribution": self.get_mastery_distribution(),
            "urgency_queue": [n.title for n in self.get_urgency_queue(10)],
            "due_today": [n.title for n in self.get_nodes_due_today()],
            "walls_detected": [
                {"parent": w["parent"].title, "child": w["child"].title}
                for w in self.detect_walls()
            ],
        }

    def get_trend_analysis(self) -> dict:
        """
        Compare older vs recent quiz attempts to determine if the student is
        improving, regressing, or stable (PRD §3.2).
        Returns {trend: str, delta: float}.
        """
        recent, older = [], []
        for n in self.nodes.values():
            history = sorted(n.quiz_history, key=lambda h: h["timestamp"])
            mid = len(history) // 2
            older += [h["score"] for h in history[:mid]]
            recent += [h["score"] for h in history[mid:]]

        avg_recent = sum(recent) / len(recent) if recent else 0.0
        avg_older = sum(older) / len(older) if older else 0.0
        delta = round(avg_recent - avg_older, 4)

        if delta > 0.05:
            trend = "improving"
        elif delta < -0.05:
            trend = "regressing"
        else:
            trend = "stable"

        return {"trend": trend, "delta": delta}

    # ------------------------------------------------------------------
    # Import / export (PRD §3.5)
    # ------------------------------------------------------------------

    def export_as_template(self) -> dict:
        """Serialize the full tree into a portable dict for template sharing."""
        template = {}
        for title, n in self.nodes.items():
            template[title] = {
                "decay_rate": n.decay_rate,
                "notes": n.notes,
                "edges": [
                    {"target": e["target"].title, "type": e["type"]}
                    for e in n.edges
                ],
            }
        return template

    def import_from_template(self, template: dict):
        """
        Rebuild a tree from an exported template dict.
        Nodes are created first, then edges are wired (PRD §3.5).
        """
        for title, data in template.items():
            n = self.add_node(title, data.get("decay_rate", 0.05))
            n.notes = data.get("notes", [])
        for title, data in template.items():
            for edge in data.get("edges", []):
                if edge["target"] in self.nodes:
                    self.add_edge(title, edge["target"], edge["type"])

    def import_from_ai_generation(self, content: str, source_type: str = "markdown"):
        """
        Build a full knowledge tree from raw student content — PRD §5.
        source_type: 'pdf' | 'markdown' | 'image' | 'plaintext'

        Full pipeline (PRD §5):
          1. EXTRACTION
             - If 'pdf': extract text using PyMuPDF page by page.
             - If 'image': send to OpenAI Vision API with prompt
               "Extract all text from this handwritten note image verbatim."
             - If 'markdown' / 'plaintext': use content directly.

          2. MARKDOWN NORMALISATION
             - Pass extracted raw text to OpenAI with prompt:
               "Convert the following content into clean, well-structured markdown.
                Preserve all headings, definitions, and examples. Remove formatting artefacts."

          3. CONCEPT IDENTIFICATION
             - Send normalised markdown to OpenAI with prompt:
               "Identify all key concepts and subtopics in this material.
                For each concept provide: title (str), a one-line description (str),
                and an estimated complexity from 1–5 (int, used to set decay_rate).
                Return a JSON list of {title, description, complexity}."
             - Map complexity to decay_rate: 1→0.02, 2→0.04, 3→0.06, 4→0.08, 5→0.10

          4. TREE STRUCTURE GENERATION
             - Send the concept list back to OpenAI with prompt:
               "Given these concepts, infer the hierarchical and prerequisite relationships.
                Return a JSON list of edges: {parent: str, child: str,
                relationship: 'requires'|'is_a_type_of'|'related_to'|'bridges_to'}"

          5. NOTE ATTACHMENT
             - For each concept, query the normalised markdown for relevant sections
               (simple keyword search or another OpenAI call).
             - Store the matched section as the node's initial note.

          6. EMBEDDING & FAISS INDEXING (per-node)
             - For each created node, write its matched note section to a temp file
               and call node.upload_notes(temp_path) which will:
                 a. chunk the text (512-token windows, 64-token overlap)
                 b. embed each chunk via Transformers.js sidecar
                 c. add vectors to that node's own FAISS IndexFlatIP
                 d. persist the index to data/faiss/{safe_title}.faiss
               Each node ends up with an isolated FAISS index containing only
               its own concept's material — no cross-node contamination.

          7. STUDENT REVIEW STEP (UI responsibility)
             - Return the partially built tree in a 'pending_review' state.
             - The UI shows the generated graph for the student to inspect,
               rename nodes, delete unwanted edges, or add missing ones.
             - Only after the student confirms does a final commit() persist
               all node records and FAISS index paths to SQLite.

        TODO: implement PDF extraction via PyMuPDF (import fitz)
        TODO: implement OpenAI Vision call for image/handwritten note OCR
        TODO: implement markdown normalisation call to OpenAI
        TODO: implement concept extraction call to OpenAI, parse JSON response
        TODO: implement edge/relationship inference call to OpenAI, parse JSON response
        TODO: call add_node for each concept (map complexity 1–5 → decay_rate 0.02–0.10)
        TODO: call add_edge for each inferred relationship
        TODO: write each node's matched note section to a temp file and call node.upload_notes()
              so the text is chunked, embedded, and indexed into that node's own FAISS index
        TODO: return the tree in 'pending_review' state; do not commit to SQLite until confirmed
        """
        pass
