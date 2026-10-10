# Kuramoto Vis

An interactive visualization of the Kuramoto model on a dumbbell graph: two complete graphs of size `N` joined by a chain of length `l`.

The nodes of each complete graph that are not attached to the chain are identical, so their motion is a single Möbius transformation of the unit disk (the Watanabe–Strogatz reduction). The app integrates this reduced system and shows each cluster as a point moving in the hyperbolic disk, next to the phases of all nodes.

## What the app shows

- **Simulation** tab
  - the Poincaré disk with all nodes on its boundary, the barycenters of the clusters, of the chain and of all nodes, and optionally the potential map and the chain edges;
  - two views: physical, and centered on a cluster or on all nodes;
  - time series: hyperbolic radius of the clusters minus `λt`, distance from synchrony `1 − |r|`, angular velocities;
  - a "microscope" for each cluster, which resolves phase differences far below machine precision;
  - a drawing of the graph for the chosen parameters.
- **The model** tab: the equations, the reduction and how to read the simulation.

Parameters: model (dumbbell or one complete graph), `N`, `l`, coupling `λ` inside the complete graphs, coupling `κ` in the chain, run length, seed of the initial phases.

## Mathematics

`source/main.pdf` (built from `source/main.tex`) is the reference for all formulas: the system, its complex form, the reduction, the gauge, the integrated variables and the numerically stable forms, with a table mapping each formula to its implementation and test. `source/v0.pdf` is the bachelor thesis it grew out of.

```bash
cd source
latexmk -pdf main.tex
```

The site shows the same formulas. After editing `main.tex`, export the labelled equations and check that every formula the site uses exists:

```bash
python3 scripts/extract_formulas.py
cd frontend && npm run check:formulas
```

## Running locally

Backend (FastAPI, numpy, scipy), managed with [uv](https://docs.astral.sh/uv/):

```bash
cd backend
uv sync
uv run uvicorn main:app --reload --port 8000
```

Frontend (Next.js 14, React, TypeScript, Tailwind, KaTeX):

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. If the backend is not on `http://localhost:8000`, set `NEXT_PUBLIC_API_URL` in `frontend/.env.local`. The backend accepts requests only from `http://localhost:3000` (CORS in `backend/main.py`).

## API

- `POST /simulate/reduced` — integrates the reduced system and the full system on the same time grid. Body: `{ mode, N, l, lambda_val, kappa, t_max?, n_frames, seed }`, where `mode` is `dumbbell` or `complete`. Without `t_max` the run lasts `3/λ₂` (dumbbell) or `30/λ` (complete graph), where `λ₂` is the smallest nonzero eigenvalue of the graph Laplacian.
- `GET /health` — health check.

The response shape is described in `frontend/src/types/api.ts`.

## Project structure

```
backend/
  main.py        FastAPI app
  kuramoto.py    full system: graph, right-hand side, integration, energy
  mobius.py      disk automorphisms, conformal barycenter, potential, stable forms
  reduced.py     reduced system, reconstruction, diagnostics, response
  tests/         pytest: reduction against the full system, formulas of the notes
  scripts/       timescales.py: 1/λ₂ against the fitted decay time
frontend/
  src/app/         page with the two tabs
  src/components/  disk, charts, microscope, graph drawing, parameter panel, model text
  src/lib/         mobius.ts (mirror of mobius.py), formulas.json (generated)
  src/types/       API types
scripts/
  extract_formulas.py   main.tex → frontend/src/lib/formulas.json
source/
  main.tex, main.pdf    mathematical notes
  v0.tex, v0.pdf        bachelor thesis
```

## Checks

```bash
cd backend
uv run pytest
```

```bash
cd frontend
npm run lint
npm run check:formulas
```
