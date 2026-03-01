# Product Requirements Document: lockingang

### AI Learning State Engine | Version 3.0 — Hackathon Final Edition

## 1. Executive Summary

lockingang is a local-first desktop application that solves the problem of passive, inefficient study for students and self-learners. Its core — the Learning State Engine — continuously models what a student knows, how fast they are forgetting it, and what single action they should take next to maximize long-term retention.

**The Core Problem**
Students spend hours re-reading notes passively without knowing which topics they are actually forgetting. They cannot answer fundamental questions about their own learning: What am I genuinely weak at? Am I improving or regressing? What should I focus on with limited time? Why do I repeatedly struggle with the same topics?
Learning is non-linear. Students experience long gaps of inactivity, bursts of intensive revision, and rely on fragmented resources across platforms. Despite the abundance of interaction data (attempts, scores, timestamps, topic tags), most students lack clear, actionable insight into their learning journey.
lockingang solves this by maintaining a live, per-topic knowledge score that decays in real-time and drives personalized quiz selection, intelligent scheduling, and AI-generated guidance — all while adapting to long-term changes in learning behavior including inactivity and accelerated progress.

**Mathematical Analogy**
If knowledge is a vector field (V) where each concept is a point, without active review the system suffers from entropy — the magnitude of these vectors (mastery) shrinks toward zero. The engine acts as an External Impulse Force that calculates the necessary work (active recall) required to counteract this decay and maintain a state of high-energy mastery.

## 3. Application Structure & Navigation

The application is organized into six primary tabs accessible from a persistent sidebar. Each tab serves a distinct purpose in the student's learning workflow.

| Tab                 | Icon | Purpose                                                                             |
| ------------------- | ---- | ----------------------------------------------------------------------------------- |
| Knowledge Tree      | 🌳   | The central hub — visualize, navigate, and interact with your entire learning graph |
| Dashboard           | 📊   | At-a-glance health metrics, forgetting forecasts, and session briefings             |
| Focus Tunnel        | 🎯   | Distraction-free task execution with the "Rule of 3" bounded queue                  |
| Chatbot             | 💬   | Agentic AI assistant for Q&A, scheduling, and graph manipulation                    |
| Templates           | 📦   | Browse, upload, and import community-shared roadmaps and curricula                  |
| Calendar & Schedule | 📅   | Unified view of Google Calendar events and auto-scheduled review sessions           |

## 4. Tab Specifications

### 4.1 Knowledge Tree (Primary Tab)

The Knowledge Tree is the heart of lockingang. It is an interactive, zoomable graph where each node represents a topic or concept and each edge represents a relationship between concepts.

**Nodes**
A node is the atomic unit of learning. Each node contains:

- **Title** — the concept name (e.g., "Quadratic Equations," "Mitochondria")
- **Competence Score** — a live value from 0.0 to 1.0 representing current mastery, decaying in real-time
- **Attached Notes** — markdown files, uploaded PDFs, images, or handwritten notes linked to this concept
- **Quiz History** — a log of every quiz attempt, score, and timestamp for this node
- **Decay Rate** — a per-node value influenced by topic complexity and the student's historical performance
- **Status Indicator** — color-coded glow showing health based on urgency (blue = strong/mastered, yellow = fading/needs review, red = critical/quiz scheduled within 24h OR due today).

**Edge**
Edges are labeled, directed relationships between nodes:

- `requires` — Topic B requires mastery of Topic A first (prerequisite)
- `is_a_type_of` — Topic B is a subtype of Topic A (taxonomy)
- `related_to` — Topics share thematic overlap (association)
- `bridges_to` — AI-generated transitional link (auto-bridge)
- Students can override, add, or remove edges to match their own mental models.

**Tree Interactions**
Clicking a node opens a detail panel with:

- **Notes View** — all attached materials rendered as markdown with syntax highlighting
- **Quiz Panel** — launches a quiz for this node
- **History Timeline** — sparkline chart showing competence score over time with quiz markers
- **Edit** — rename, change decay rate, attach/detach notes, reposition in graph

Right-click context menu:

- Add child node
- Add edge to another node
- Generate AI bridge node
- Trigger grandparent reset
- Delete node

**Visual Overlays**

- **Fog of War** — nodes below a competence threshold (< 0.3) are visually dimmed and blurred, making decay tangible
- **Forgetting Forecast** — a 7-day predictive heatmap overlay showing which nodes will decay below threshold if not reviewed
- **Urgency Pulse** — nodes in the active urgency queue gently pulse to draw attention

**Building the Tree**
Students can build their tree in three ways:

1.  **Manual Creation** — add nodes and edges one by one via the UI
2.  **Import a Template** — clone a pre-built roadmap from the Templates tab
3.  **AI Auto-Generation from Content** — upload a textbook, PDF, or set of notes, and the AI parses, converts to markdown, extracts key concepts, and generates a complete tree structure automatically

### 4.2 Dashboard

The Dashboard provides a read-only, at-a-glance summary of the student's current learning state. It is the first screen a returning student sees.

**Dashboard Sections**

- **Task List:** The Urgency Queue showing the top 5–10 nodes most in need of review, synced daily scheduling blocks and tasks managed via the Focus Tunnel.
- **Chatbot:** Seamlessly integrated agentic AI assistant for RAG-powered Q&A, graph manipulation, and study planning, accessible directly from the dashboard.
- **Graphs:** The Mastery Overview and Knowledge Tree minimap, showing the distribution of node competence scores across all topics and recent activity.
- **Calendar:** A unified timeline view displaying Google Calendar events side-by-side with locked auto-scheduled review sessions.
-**Activity Heatmap:** A GitHub-style contribution grid showing daily study activity over the past 3 months. 
- **Analysis:** Provides the Session Briefing and Trend Analysis, offering synthesized insights on recent decay and whether the student is improving or regressing over time.
- **User Settings:** Access to configure API keys, toggle integrations (Google Calendar, Todoist, Pinecone), set study preferences, and manage templates.

### 4.3 Focus Tunnel

The Focus Tunnel is a distraction-free task execution environment built on the principle of constraint over freedom.

**The Rule of 3**
The active task queue has a hard limit of 3 tasks. The "Add Task" button is disabled when 3 tasks are active. This prevents decision fatigue and enforces prioritization. Tasks can be sourced from:

- Urgency queue recommendations
- Manual addition
- AI chatbot suggestions
- Todoist sync

**Zen Mode**
Selecting a task and entering Zen Mode triggers a full-screen takeover:

- All navigation, sidebar, and chrome are hidden
- Only the task title, attached notes/quiz, and a visual countdown timer are displayed
- A single "Exit" button returns to normal view

**Brain Dump Shortcut**
A global hotkey (Cmd/Ctrl + J) opens a quick-capture modal. The student types a thought, and it is saved to an Inbox with the context of what they were working on (current node, active task). This offloads intrusive thoughts without breaking flow state.

### 4.4 Chatbot (Agentic AI Assistant)

The Chatbot tab provides a conversational AI assistant that is deeply integrated with the student's knowledge graph and external services.

**Capabilities**

- **RAG-Powered Q&A:** Queries Pinecone using the student's own embedded notes as the retrieval corpus. Answers are grounded in materials, citing specific nodes.
- **Graph Awareness:** Can pull any node's data (competence score, quiz history) and use it in conversation.
- **Calendar & Scheduling Actions:** Create, modify, and delete events on Google Calendar and Todoist via natural language.
- **Graph Manipulation:** Create nodes, add edges, attach notes, and trigger quizzes via conversation.
- **Study Planning:** Generates multi-day study plans for upcoming exams and auto-schedules review sessions.

### 4.5 Templates (Community Roadmaps)

The Templates tab is a library of pre-built learning roadmaps created and shared by teachers, tutors, and other students.

**Browsing & Importing**

- Templates are searchable by subject, difficulty, author, and rating
- Importing clones the entire tree (nodes, edges, notes, pre-made quizzes) into the graph
- After import, the student fully owns the clone and can modify it freely

**Uploading & Sharing**

- Any student can export their own tree (or subtree) as a template
- Uploaded templates undergo basic moderation/review before appearing publicly

### 4.6 Calendar & Schedule

This tab provides a unified weekly view combining Google Calendar events with lockingang's auto-scheduled review sessions.

**Display**

- Standard weekly calendar grid (Mon–Sun)
- Google Calendar events shown in their default colors; Auto-scheduled review blocks (quizzes) shown with an indicator corresponding to their node's urgency color (blue/yellow/red).
- When a node hits the 'yellow' state, a quiz is automatically scheduled a few days out in the calendar.
- 1 day before the scheduled quiz, and on the day itself, the calendar indicator and node turn 'red'.
- Once the quiz is cleared, the node reverts back to its original 'blue' state, and the scheduled quiz is removed from the calendar.

**Interaction**

- Review blocks can be dragged to reschedule (within the 1-week window)
- Clicking a review block opens the relevant node's quiz panel
- Completed reviews are automatically marked, updating competence scores

## 5. Quiz Engine

The quiz engine is the primary mechanism for active recall. Every quiz interaction updates the student's competence scores and feeds adaptive logic.

**Quiz Flow (Triggered from Any Node)**

1.  **Source Selection:** System searches for relevant Kahoot quizzes matching the topic.
2.  **Kahoot Evaluation:** AI evaluates Kahoot content for relevance and quality, assessing difficulty level. If appropriate, questions are adapted.
3.  **Fallback Generation:** If no Kahoot exists, the Multi-Modal RAG engine generates an in-house quiz based strictly on the student's materials.
4.  **Quiz Delivery:** Questions presented one at a time in a distraction-free interface.
5.  **Scoring & State Update:** Immediate feedback and explanations. Node competence score is updated (correct -> 1.0, incorrect -> 0.2). Decay clock resets.

**Synthesis Quizzes**
When two parent nodes point to one child node (Diamond Problem), the AI generates synthesis questions requiring integrated understanding of both concepts.

## 6. Content Ingestion Pipeline

Students upload raw materials, and AI automatically structures them into a learning tree.

**Supported Inputs:** PDF textbooks/chapters, Markdown/plain text, images of handwritten notes, slide decks.
**Pipeline Steps:**

1.  **Extraction:** Text, images, OCR of handwritten content.
2.  **Markdown Conversion:** Normalized to clean markdown.
3.  **Concept Identification:** AI identifies concepts and subtopics.
4.  **Tree Generation:** Concepts organized hierarchically with edges.
5.  **Note Attachment:** Relevant sections attached to nodes.
6.  **Embedding:** Content embedded via Transformers.js and indexed in Pinecone.
7.  **Review:** Student reviews and adjusts the generated tree before finalizing.

## 7. Auto-Scheduler (Intelligent Study Planning)

Because the app has deep knowledge of the student's per-topic mastery, decay rates, and quiz history, it schedules study time with precision.

**Forgetting Curve Optimizer**

- Projects when nodes will fall below critical threshold (0.3).
- Generates optimal review slots.
- Auto-inserts sessions into Google Calendar.
- Sessions recalculated daily.

**Exam Preparation Mode**

- **Scope Detection:** Identifies nodes relevant to the exam.
- **Gap Analysis:** Highlights nodes below target competence.
- **Plan Generation:** Creates a multi-day plan front-loading weak topics.
- **Calendar Injection:** Approved sessions scheduled with direct links.

**Todoist Integration**

- Bidirectional sync for tasks.
- Natural language task creation.
- Priority levels map to urgency weighting.

## 8. Adaptive Logic Engine

Identifies when a student is structurally stuck and intervenes automatically.

- **The Wall Detection:** If a student fails a child node's quiz 3+ times while the parent node shows mastery (>0.7), system flags it as "The Wall."
- **Auto-Bridge Nodes:** System generates a new bridge node between parent and difficult child containing introductory content.
- **Grandparent Reset:** If failure persists, escalates by resetting grandparent node's score to 0.0, forcing review of fundamentals.

## 9. Forgetting Curve Engine (Active Recall)

- **Real-Time Decay Model:** `live_score = stored_score × (1 − decay_rate) ^ days_elapsed`
- **Background Decay Cycle:** Hourly background job runs across all active nodes (SQLite WAL mode).
- **7-Day Forgetting Forecast:** Projects node state over time based on decay rates.

## 10. Ideal User Flow

1.  **First-Time Setup:** Import template or upload course materials. AI generates knowledge tree. Connect Google Calendar/Todoist.
2.  **Daily Study Session:** Dashboard briefing -> Move top items to Focus Tunnel -> Zen Mode -> Quit. Stray thoughts captured via Brain Dump. Decay clock recalculates next day's blocks.
3.  **Exam Preparation:** Chatbot proposes a N-day study plan, which is injected into Calendar.
4.  **Ongoing Adaptation:** AI detects trends and issues, intervening with Bridge nodes or grandparent resets automatically.
