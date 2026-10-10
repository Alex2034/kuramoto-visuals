"""
Slow time scale of the dumbbell graph: tau = 1 / lambda_2 (Fiedler value of the weighted
Laplacian) against the decay time fitted from |theta_N - theta_{N+l+1}| in the reduced run.

Run from backend/:  uv run python scripts/timescales.py
"""
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from kuramoto import build_dumbbell_adjacency, fiedler  # noqa: E402
from reduced import run_reduced  # noqa: E402

CASES = [
    (10, 10, 1.0, 1.0),
    (20, 20, 1.0, 1.0),
    (20, 20, 5.0, 1.0),
    (20, 20, 1.0, 5.0),
    (20, 40, 1.0, 1.0),
    (40, 10, 2.0, 0.5),
]


def fitted_vs_predicted():
    print("N    l    lambda  kappa   1/lambda_2    fitted tau   rel.diff   max residual")
    for N, l, lam, kappa in CASES:
        res = run_reduced(N, l, lam, kappa, seed=0, n_frames=300)
        tau, fit = res["tau"], res["tau_fit"]
        print(
            f"{N:<4} {l:<4} {lam:<7} {kappa:<7} {tau:<13.4f} {fit:<12.4f} "
            f"{abs(fit / tau - 1):<10.1e} {max(res['residual']):.1e}"
        )


def tau_map(N=20, l=20):
    """tau(lambda, kappa) from the Laplacian alone — no integration, no random initial data."""
    grid = [0.5, 1, 2, 5, 10, 20, 50]
    print(f"\ntau = 1/lambda_2 for N = {N}, l = {l}  (rows: lambda, columns: kappa)")
    print("lambda\\kappa " + "".join(f"{k:>10}" for k in grid))
    for lam in grid:
        row = [1 / fiedler(build_dumbbell_adjacency(N, l, lam, k)) for k in grid]
        print(f"{lam:<13}" + "".join(f"{t:>10.2f}" for t in row))


if __name__ == "__main__":
    np.set_printoptions(precision=4, suppress=True)
    fitted_vs_predicted()
    tau_map()
