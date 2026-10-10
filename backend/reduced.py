"""
Watanabe–Strogatz reduction of the complete-graph components of the dumbbell graph.

Each clique (nodes 1..N-1 "constants", node N attached to the chain) is described by
z_j = zeta * T_w(beta_j), j < N, with w = tanh(rho/2) e^{i phi}, zeta = e^{i alpha},
plus the physical phase theta_N of the attached node. State per disk:
(Re v, Im v, alpha, theta_N) with v = rho e^{i phi}; the chain keeps its l phases.

Gauge: the conformal barycenter of beta is 0, so P = -zeta * w is the barycenter of
the cluster and T_P(z_j) = zeta * beta_j.
"""
import numpy as np
from scipy.integrate import solve_ivp

from kuramoto import build_dumbbell_adjacency, energy, fiedler, integrate_full
from mobius import T, T_w_boundary, barycenter, microscope, potential_gauge, s_of_rho

RTOL = 1e-11
ATOL = 1e-12
DISK = 4  # reals per disk: Re v, Im v, alpha, theta_N


def calibrate(theta_const: np.ndarray, theta_node: float) -> tuple[np.ndarray, np.ndarray]:
    """Canonical gauge for one clique: returns (beta_angles, disk state at t = 0)."""
    z = np.exp(1j * theta_const)
    p0 = barycenter(z)
    beta = np.angle(T(p0, z))
    r = abs(p0)
    v = -2 * np.arctanh(r) * p0 / r if r > 0 else 0j
    return beta, np.array([v.real, v.imag, 0.0, theta_node])


def _c_k(rho: float) -> tuple[float, float]:
    """c = rho / sinh(rho), k = (1 - c) / rho^2."""
    if rho < 1e-4:
        return 1 - rho**2 / 6, 1 / 6 - 7 * rho**2 / 360
    if rho > 700:
        return 0.0, 1 / rho**2
    c = rho / np.sinh(rho)
    return c, (1 - c) / rho**2


def disk_rhs(d: np.ndarray, beta: np.ndarray, lam: float, N: int) -> np.ndarray:
    """
    Clique-internal part of the flow for one disk state d = (Re v, Im v, alpha, theta_N),
    i.e. d/dt of d without the chain term on theta_N.
    """
    v = complex(d[0], d[1])
    alpha, theta_n = d[2], d[3]
    rho = abs(v)
    phi = np.angle(v) if rho > 0 else 0.0
    zeta = np.exp(1j * alpha)
    m = T_w_boundary(rho, phi, beta)
    q = (m.sum() + np.conj(zeta) * np.exp(1j * theta_n)) / N
    c, k = _c_k(rho)
    v_dot = -lam * ((1 + c) / 2 * q + k / 2 * v * v * np.conj(q))
    w = (1 - s_of_rho(rho)) * np.exp(1j * phi)
    alpha_dot = -lam * (np.conj(w) * q).imag
    theta_dot = lam * (zeta * q * np.exp(-1j * theta_n)).imag
    return np.array([v_dot.real, v_dot.imag, alpha_dot, theta_dot])


def reduced_rhs(t, y, betas, lam, kappa, N, l):
    """Right-hand side of the reduced system. betas: one array per disk (1 or 2 disks)."""
    out = np.empty_like(y)
    out[:DISK] = disk_rhs(y[:DISK], betas[0], lam, N)
    if len(betas) == 1:
        return out
    out[DISK:2 * DISK] = disk_rhs(y[DISK:2 * DISK], betas[1], lam, N)
    # chain with the two attached clique nodes as its ends
    ext = np.concatenate(([y[3]], y[2 * DISK:], [y[DISK + 3]]))
    pull = kappa * np.sin(np.diff(ext))  # pull[i] = kappa sin(ext[i+1] - ext[i])
    out[3] += pull[0]
    out[DISK + 3] -= pull[-1]
    out[2 * DISK:] = pull[1:] - pull[:-1]
    return out


def disk_phases(d: np.ndarray, beta: np.ndarray) -> np.ndarray:
    """Phases of the N-1 constant nodes of a clique, reconstructed from the disk state."""
    v = complex(d[0], d[1])
    rho = abs(v)
    phi = np.angle(v) if rho > 0 else 0.0
    return d[2] + np.angle(T_w_boundary(rho, phi, beta))


def initial_state(theta0: np.ndarray, N: int, l: int, mode: str):
    """Split full-system phases into (betas, y0). Node order follows kuramoto.build_dumbbell_adjacency."""
    beta1, d1 = calibrate(theta0[:N - 1], theta0[N - 1])
    if mode == "complete":
        return [beta1], d1
    beta2, d2 = calibrate(theta0[N + l + 1:], theta0[N + l])
    return [beta1, beta2], np.concatenate((d1, d2, theta0[N:N + l]))


def reconstruct(y: np.ndarray, betas, N: int, l: int) -> np.ndarray:
    """All phases of the full system from a reduced state (same node order as the full system)."""
    first = np.concatenate((disk_phases(y[:DISK], betas[0]), [y[3]]))
    if len(betas) == 1:
        return first
    second = np.concatenate(([y[DISK + 3]], disk_phases(y[DISK:2 * DISK], betas[1])))
    return np.concatenate((first, y[2 * DISK:], second))


def integrate_reduced(y0, betas, lam, kappa, N, l, t_eval, rtol=RTOL, atol=ATOL) -> np.ndarray:
    sol = solve_ivp(
        reduced_rhs, (t_eval[0], t_eval[-1]), y0, t_eval=t_eval,
        args=(betas, lam, kappa, N, l), method="DOP853", rtol=rtol, atol=atol,
    )
    if not sol.success:
        raise RuntimeError(sol.message)
    return sol.y


def time_grid(lam: float, t_max: float, n_frames: int) -> np.ndarray:
    """Dense up to 10/lambda (cluster collapse), then uniform up to t_max (chain relaxation)."""
    t_fast = 10 / lam if lam > 0 else t_max
    if t_fast >= t_max:
        return np.linspace(0, t_max, n_frames)
    n_fast = n_frames // 3
    return np.concatenate((
        np.linspace(0, t_fast, n_fast, endpoint=False),
        np.linspace(t_fast, t_max, n_frames - n_fast),
    ))


def cross_ratios(z: np.ndarray) -> np.ndarray:
    """Cross-ratios (z_i, z_{i+1}, z_{i+2}, z_{i+3}) of eq. (2.2) along consecutive points."""
    a, b, c, d = z[:-3], z[1:-2], z[2:-1], z[3:]
    return (a - c) / (a - b) * (d - b) / (d - c)


def order_deficit(rho, phi, alpha, theta_node, beta, N) -> float:
    """
    1 - |r| for one clique without cancellation: 1 - |r|^2 = (4/N^2) sum_{i<j} sin^2((theta_i - theta_j)/2),
    with the phase differences of the collapsed nodes taken from the microscope offsets s * mu_j.
    """
    off = s_of_rho(rho) * microscope(rho, phi, beta)  # theta_j - Theta, Theta = alpha + phi + pi
    pairs = np.sin((off[:, None] - off[None, :]) / 2) ** 2
    node = np.sin((theta_node - (alpha + phi + np.pi) - off) / 2) ** 2
    one_minus_r2 = 4 / N**2 * (pairs.sum() / 2 + node.sum())
    return float(one_minus_r2 / (1 + np.sqrt(max(1 - one_minus_r2, 0.0))))


# below this distance from the boundary the global barycenter is not resolved in double precision
GLOBAL_MIN_GAP = 1e-12


def global_frame(theta: np.ndarray):
    """
    Conformal barycenter of all nodes and their phases in the frame centered at it.
    Returns (center, angles), or (None, None) when the configuration is too narrow to resolve.
    """
    z = np.exp(1j * theta)
    try:
        p = barycenter(z)
    except ValueError:
        return None, None
    if 1 - abs(p) < GLOBAL_MIN_GAP:
        return None, None
    return [p.real, p.imag], np.angle(T(p, z)).tolist()


def wrap(x):
    return (x + np.pi) % (2 * np.pi) - np.pi


def fit_tau(times: np.ndarray, gap: np.ndarray, tau: float):
    """Decay time of |gap| ~ exp(-t/tau_fit), fitted on the late window [2 tau, 4 tau]."""
    mask = (times >= 2 * tau) & (times <= 4 * tau) & (gap > 0)
    if mask.sum() < 5:
        return None
    slope = np.polyfit(times[mask], np.log(gap[mask]), 1)[0]
    return float(-1 / slope) if slope < 0 else None


def run_reduced(
    N: int,
    l: int,
    lambda_val: float,
    kappa: float,
    t_max: float | None = None,
    n_frames: int = 300,
    seed: int = 41,
    mode: str = "dumbbell",
    max_auto_t: float | None = None,
) -> dict:
    """
    Integrate the reduced system and the full system on the same grid and return
    per-frame data for the frontend plus diagnostics.
    """
    if mode == "complete":
        V = N
        W = lambda_val / N * (np.ones((N, N)) - np.eye(N))
        lambda2 = None
    else:
        V = 2 * N + l
        W = build_dumbbell_adjacency(N, l, lambda_val, kappa)
        lambda2 = fiedler(W)
    tau = 1 / lambda2 if lambda2 and lambda2 > 1e-12 else None
    if t_max is None:
        if mode == "complete":
            t_max = 30 / lambda_val if lambda_val > 0 else 10.0
        elif tau is None:
            raise ValueError("t_max is required when the graph is disconnected (kappa = 0)")
        else:
            t_max = 5 * tau
            if max_auto_t is not None and t_max > max_auto_t:
                raise ValueError(
                    f"default t_max = 5/lambda_2 = {t_max:.0f} exceeds {max_auto_t:.0f}; pass t_max explicitly"
                )

    np.random.seed(seed)
    theta0 = np.random.uniform(-np.pi, np.pi, V)
    betas, y0 = initial_state(theta0, N, l, mode)
    times = time_grid(lambda_val, t_max, n_frames)

    y = integrate_reduced(y0, betas, lambda_val, kappa, N, l, times)
    full = integrate_full(theta0, W, times, rtol=RTOL, atol=ATOL, method="DOP853")

    n_disks = len(betas)
    theta_red = np.array([reconstruct(y[:, i], betas, N, l) for i in range(len(times))]).T
    residual = np.abs(np.exp(1j * theta_red) - np.exp(1j * full)).max(axis=0)

    disks = []
    for k in range(n_disks):
        d = y[k * DISK:(k + 1) * DISK]
        rho = np.hypot(d[0], d[1])
        phi = np.arctan2(d[1], d[0])
        beta = betas[k]
        nodes = slice(0, N) if k == 0 else slice(V - N, V)
        consts = slice(0, N - 1) if k == 0 else slice(V - N + 1, V)
        r_abs = np.abs(np.exp(1j * theta_red[nodes]).mean(axis=0))
        f = [potential_gauge(rho[i], phi[i], beta, d[3, i] - d[2, i], N) for i in range(len(times))]
        mu = np.array([microscope(rho[i], phi[i], beta) for i in range(len(times))])
        deficit = [order_deficit(rho[i], phi[i], d[2, i], d[3, i], beta, N) for i in range(len(times))]
        # cross-ratios of the full system are only resolvable while the cluster is
        # wider than machine precision
        early = times <= (20 / lambda_val if lambda_val > 0 else times[-1])
        cr = np.array([cross_ratios(np.exp(1j * full[consts, i])) for i in np.flatnonzero(early)])
        drift = np.abs(cr / cr[0] - 1).max(axis=1) if cr.size else np.array([])
        disks.append({
            "beta": beta.tolist(),
            "rho": rho.tolist(),
            "phi": phi.tolist(),
            "alpha": d[2].tolist(),
            "theta_node": d[3].tolist(),
            "r_abs": r_abs.tolist(),
            "r_deficit": deficit,
            "f": f,
            "mu": mu.tolist(),
            "cross_ratio_drift": drift.tolist(),
        })

    result = {
        "mode": mode,
        "N": N,
        "l": l if mode == "dumbbell" else 0,
        "lambda_val": lambda_val,
        "kappa": kappa if mode == "dumbbell" else 0.0,
        "times": times.tolist(),
        "disks": disks,
        "chain": y[2 * DISK:].T.tolist() if n_disks == 2 else [],
        "full": wrap(full).T.tolist(),
        "lambda2": lambda2,
        "tau": tau,
        "tau_fit": None,
        "residual": residual.tolist(),
        "energy": [energy(theta_red[:, i], W) for i in range(len(times))],
        "gap": [],
        "global_center": [],
        "global_angles": [],
    }
    if n_disks == 2:
        frames = [global_frame(theta_red[:, i]) for i in range(len(times))]
        result["global_center"] = [c for c, _ in frames]
        result["global_angles"] = [a for _, a in frames]
        gap = np.abs(wrap(y[3] - y[DISK + 3]))
        result["gap"] = gap.tolist()
        if tau is not None:
            result["tau_fit"] = fit_tau(times, gap, tau)
    return result
