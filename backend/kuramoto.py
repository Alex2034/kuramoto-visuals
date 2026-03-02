"""
Pure Kuramoto simulation logic for dumbbell graph.
No Streamlit/Plotly/Pandas — only numpy and plain structures.
"""
import numpy as np
from scipy.integrate import solve_ivp


def build_dumbbell_adjacency(N: int, l: int, lambda_val: float, kappa: float) -> np.ndarray:
    """Build adjacency matrix for dumbbell graph: two complete graphs of size N connected by chain of length l."""
    V = 2 * N + l
    W = np.zeros((V, V))
    for i in range(N):
        for j in range(N):
            if i != j:
                W[i, j] = lambda_val / N
    for i in range(N + l, V):
        for j in range(N + l, V):
            if i != j:
                W[i, j] = lambda_val / N
    for i in range(N - 1, N + l):
        W[i, i + 1] = kappa
        W[i + 1, i] = kappa
    return W


def kuramoto_ode(t: float, theta: np.ndarray, W: np.ndarray) -> np.ndarray:
    """Right-hand side of Kuramoto ODE: dθ_i/dt = Σ_j W_ij sin(θ_j - θ_i)."""
    theta_diff = theta.reshape(1, -1) - theta.reshape(-1, 1)
    return np.sum(W * np.sin(theta_diff), axis=1)


def run_simulation(
    N: int,
    l: int,
    lambda_val: float,
    kappa: float,
    t_max: float,
    n_frames: int = 100,
    seed: int = 42,
) -> dict:
    """
    Run Kuramoto simulation and return data suitable for frontend.
    Returns: { "times": [...], "frames": [ { "t": float, "points": [ { "index": int, "x": float, "y": float, "nodeType": str } ] } ] }
    """
    V = 2 * N + l
    W = build_dumbbell_adjacency(N, l, lambda_val, kappa)

    np.random.seed(seed)
    theta0 = np.random.uniform(-np.pi, np.pi, V)

    t_eval = np.linspace(0, t_max, n_frames)
    sol = solve_ivp(kuramoto_ode, (0, t_max), theta0, t_eval=t_eval, args=(W,))

    # Node types: "component" (blue) for clusters, "chain" (red) for chain
    node_types = ["component"] * N + ["chain"] * l + ["component"] * N

    times = [round(float(t), 1) for t in sol.t]
    frames = []

    for frame_idx, t_val in enumerate(sol.t):
        thetas = sol.y[:, frame_idx]
        x = np.cos(thetas)
        y = np.sin(thetas)

        points = [
            {
                "index": i,
                "x": float(x[i]),
                "y": float(y[i]),
                "nodeType": node_types[i],
            }
            for i in range(V)
        ]
        frames.append({"t": round(float(t_val), 1), "points": points})

    return {"times": times, "frames": frames}
