# Run Guide (FastAPI + React)

## 1) Start the backend (FastAPI)

From the project root:

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

Verify the API is up (this is not the chat UI):

```powershell
curl http://localhost:8000/health
```

## 2) Start the frontend (React + Vite)

In a new terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the chat UI at `http://localhost:5173`.

## 3) Configure API base URL (optional)

Edit:

`frontend/.env`

Example:

```
VITE_API_BASE_URL=http://localhost:8000
```
