# Kuramoto Vis

Visualization of the Kuramoto model on a dumbbell graph: two complete graphs connected by a chain.

## Architecture

- **Backend** (FastAPI): Python computation (numpy, scipy) exposed via REST API
- **Frontend** (Next.js + React + TypeScript): Parameter controls and animated visualization

## Quick Start

### Backend

```bash
conda activate kuramoto_vis
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API: `http://localhost:8000`
- `POST /simulate` — run simulation (body: `{ N, l, lambda_val, kappa, t_max }`)
- `GET /health` — health check

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:3000`

Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `.env.local` if the backend runs on a different host.

## Project Structure

```
kuramoto_vis/
├── backend/
│   ├── main.py           # FastAPI app + /simulate endpoint
│   ├── kuramoto.py       # Pure simulation logic
│   ├── requirements.txt
│   └── test_api.py       # API verification script
├── frontend/             # Next.js App Router
│   └── src/
│       ├── app/
│       ├── components/
│       └── types/
└── streamlit_example.py  # Original monolithic reference
```

## Verification

With the backend running:

```bash
conda run -n kuramoto_vis pip install requests
conda run -n kuramoto_vis python backend/test_api.py
```
