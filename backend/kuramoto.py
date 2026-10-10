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


def integrate_full(
    theta0: np.ndarray,
    W: np.ndarray,
    t_eval: np.ndarray,
    rtol: float = 1e-3,
    atol: float = 1e-6,
    method: str = "RK45",
) -> np.ndarray:
    """Integrate the full system; returns theta with shape (V, len(t_eval))."""
    sol = solve_ivp(
        kuramoto_ode, (t_eval[0], t_eval[-1]), theta0, t_eval=t_eval, args=(W,),
        rtol=rtol, atol=atol, method=method,
    )
    return sol.y


def fiedler(W: np.ndarray) -> float:
    """Second-smallest eigenvalue of the weighted graph Laplacian (slowest relaxation rate near sync)."""
    L = np.diag(W.sum(axis=1)) - W
    return float(np.linalg.eigvalsh(L)[1])


def energy(theta: np.ndarray, W: np.ndarray) -> float:
    """E = -sum_{i<j} W_ij cos(theta_i - theta_j); the full system is its gradient flow."""
    diff = theta.reshape(1, -1) - theta.reshape(-1, 1)
    return float(-0.5 * np.sum(W * np.cos(diff)))
