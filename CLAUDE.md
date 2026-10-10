# kuramoto-visuals

Visualization of the Kuramoto model on a dumbbell graph (two complete graphs of
size `N` joined by a chain of length `l`). Inherits `~/projects/CLAUDE.md`.

## Layout
- `backend/` — FastAPI app. `kuramoto.py` is the pure simulation (numpy/scipy,
  no web or plotting imports); `main.py` only wraps it in
  `POST /simulate/reduced` and `GET /health`.
- `backend/reduced.py` + `backend/mobius.py` — Watanabe–Strogatz reduction of the
  cliques in variables `(v, alpha, theta_N)`, `v = rho e^{i phi}`,
  `w = tanh(rho/2) e^{i phi}`; gauge fixed by conformal barycenter of `beta` = 0.
  Near the boundary everything goes through `s = 1 - tanh(rho/2)`; never form
  `1 - |w|` by subtraction. `frontend/src/lib/mobius.ts` mirrors these formulas.
- `source/main.tex` → `source/main.pdf` — the mathematical reference. Equations
  carry stable labels `eq:<slug>`; section 9 maps each to its implementation and
  test (`backend/tests/test_formulas.py` checks the statements the code does not
  use). When the model changes: document first, then tests, then code; rebuild
  with `cd source && latexmk -pdf main.tex` and commit the PDF.
- Formulas on the site come from the notes: `python3 scripts/extract_formulas.py`
  writes `frontend/src/lib/formulas.json` from the labelled equations of
  `main.tex`; `<Formula id="eq:...">` renders them with KaTeX. Rerun it after
  editing `main.tex`, then `cd frontend && npm run check:formulas`. Every symbol
  shown in the interface must be defined next to where it appears.
- `frontend/` — Next.js 14 App Router + TypeScript + Tailwind. API types live in
  `src/types/api.ts` and must match the backend response shape.

## Commands
Backend is a uv project rooted at `backend/` (not the repo root), and `main.py`
imports `kuramoto` as a top-level module, so run from inside `backend/`:

```bash
cd backend
uv sync
uv run uvicorn main:app --reload --port 8000
uv run pytest                    # reduction vs full system, no server needed
```

Frontend:

```bash
cd frontend
npm install
npm run dev                      # http://localhost:3000
npm run lint
```

## Notes
- The pytest suite lives in `backend/tests/`. There is no `scripts/check.sh` yet.
- CORS in `main.py` only allows `http://localhost:3000`.
