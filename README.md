# Kuramoto Vis

Visualization of the Kuramoto model on a dumbbell graph: two complete graphs connected by a chain.

## Mathematics

`source/main.pdf` (built from `source/main.tex`) is the reference for all formulas: the system, its complex form, the Watanabe–Strogatz reduction, the gauge, the integrated variables and the numerically stable forms, with a table mapping each formula to its implementation and test. `source/v0.pdf` is the bachelor thesis it grew out of.

```bash
cd source
latexmk -pdf main.tex
```

## Architecture

- **Backend** (FastAPI): Python computation (numpy, scipy) exposed via REST API
- **Frontend** (Next.js + React + TypeScript): Parameter controls and animated visualization

## Quick Start

### Backend

Python dependencies are managed with [uv](https://docs.astral.sh/uv/) (`backend/pyproject.toml` + `backend/uv.lock`).

```bash
cd backend
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API: `http://localhost:8000`
- `POST /simulate` — run simulation (body: `{ N, l, lambda_val, kappa, t_max }`)
- `POST /simulate/reduced` — Watanabe–Strogatz reduction of the complete-graph components next to the full system (body: `{ mode, N, l, lambda_val, kappa, t_max?, n_frames, seed }`, `mode` is `dumbbell` or `complete`)
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
│   ├── kuramoto.py       # Pure simulation logic (full system)
│   ├── mobius.py         # Disk automorphisms, conformal barycenter, potential
│   ├── reduced.py        # Reduction onto the hyperbolic disk (WS ansatz)
│   ├── tests/            # pytest: reduction vs full system
│   ├── scripts/          # timescales.py: 1/lambda_2 vs fitted decay time
│   ├── pyproject.toml    # uv project (deps + lockfile in uv.lock)
│   └── test_api.py       # API verification script
├── frontend/             # Next.js App Router
│   └── src/
│       ├── app/
│       ├── components/
│       └── types/
├── source/               # main.tex / main.pdf: mathematical notes; v0: thesis
└── streamlit_example.py  # Original monolithic reference
```

## Verification

```bash
cd backend
uv run pytest
uv run python scripts/timescales.py
```

With the backend running:

```bash
cd backend
uv run python test_api.py
```

The original Streamlit reference needs an extra dependency group:

```bash
uv run --project backend --group streamlit streamlit run streamlit_example.py
```
