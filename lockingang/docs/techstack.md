# Technical Stack

To ensure privacy and zero-latency performance, lockingang utilizes a fully local stack with selective cloud integrations.

| Layer                | Technology                   | Purpose                                         |
| -------------------- | ---------------------------- | ----------------------------------------------- |
| App Shell            | Electron                     | Cross-platform desktop container               |
| UI Framework         | React + Tailwind CSS         | Minimalist, high-contrast interface             |
| Backend Logic        | Node.js                      | Core engine, scheduling, decay cycles           |
| Knowledge Graph      | getzep/graphiti              | Relationship modeling between concepts          |
| AI(LLM & Vision)(RAG)| OpenAI API                   | Quiz generation, content analysis, 
| Vector Database      | Pinecone DB                  | Used for the RAG
| API for RAG          | FastAPI                      | Used to separate RAG AI system and forntend, need an API for the RAG AI chatbot|
| On-Device Embeddings | Transformers.js (Web Worker) | 768-float semantic vectors, fully local         |
| Database             | SQLite + WAL mode            | Prevents locks during background decay cycles   |
| Vector Search        | Pinecone (API)               | Semantic retrieval for RAG chatbot              |
| Calendar             | Google Calendar API          | Display and schedule tasks (up to 1 week ahead) |
| Task Management      | Todoist API                  | Natural-language task capture and sync          |
| External Quiz Source | Kahoot API / Scraping        | Sourcing community quiz content                 |


