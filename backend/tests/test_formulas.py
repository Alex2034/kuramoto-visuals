"""
Numerical checks of the statements in source/main.tex that the code itself does not rely on.
Each test names the equation label it backs.
"""
import numpy as np
import pytest

from kuramoto import build_dumbbell_adjacency, energy, fiedler, kuramoto_ode
from mobius import T, T_inv, barycenter, log_poisson, potential_gauge, w_from_v
from reduced import DISK, reconstruct, reduced_rhs, run_reduced
from test_reduced import random_state

N, L, LAM, KAPPA = 7, 5, 1.3, 0.7


def ws_parts(y, beta):
    """(w, zeta, z_const, z_node) of the first disk."""
    w = w_from_v(complex(y[0], y[1]))
    zeta = np.exp(1j * y[2])
    return w, zeta, zeta * T(w, np.exp(1j * beta)), np.exp(1j * y[3])


def test_psi_form_matches_theta_form():
    """eq:psi-dot — psi = T_w^{-1}(conj(zeta) z_N) obeys the thesis equation (v0 2.7)."""
    rng = np.random.default_rng(20)

    def psi_of(y, beta):
        w, zeta, _, z_node = ws_parts(y, beta)
        return T_inv(w, np.conj(zeta) * z_node)

    for _ in range(5):
        betas, y = random_state(rng, N, L, 3.0)
        dy = reduced_rhs(0.0, y, betas, LAM, KAPPA, N, L)
        h = 1e-6
        psi_dot = (psi_of(y + h * dy, betas[0]) - psi_of(y - h * dy, betas[0])) / (2 * h)
        w, zeta, _, _ = ws_parts(y, betas[0])
        psi = psi_of(y, betas[0])
        z_next = np.exp(1j * y[2 * DISK])
        expected = -KAPPA / (2 * (1 - abs(w) ** 2)) * (
            zeta * np.conj(z_next) * (psi - w) ** 2 - np.conj(zeta) * z_next * (1 - np.conj(w) * psi) ** 2
        )
        assert abs(psi_dot - expected) < 1e-7
        # eq:chi-dot — the same in angles: chi' = kappa sin(theta_{N+1} - theta_N) / P(w, psi)
        chi_dot = (psi_dot / (1j * psi)).real
        poisson = (1 - abs(w) ** 2) / abs(w - psi) ** 2
        assert chi_dot == pytest.approx(KAPPA * np.sin(y[2 * DISK] - y[3]) / poisson, abs=1e-7)


def test_gradient_form_of_w_equation():
    """eq:poisson-gradient — (1 - |w|^2) d/d conj(w) ln P(w, beta) = T_w(beta)."""
    rng = np.random.default_rng(21)
    w = 0.6 * np.exp(1j * 0.9)
    beta = np.exp(1j * rng.uniform(-np.pi, np.pi, 6))
    h = 1e-6
    # d/d conj(w) = (d/dx + i d/dy) / 2
    dx = (log_poisson(w + h, beta) - log_poisson(w - h, beta)) / (2 * h)
    dy = (log_poisson(w + 1j * h, beta) - log_poisson(w - 1j * h, beta)) / (2 * h)
    assert np.allclose((1 - abs(w) ** 2) * (dx + 1j * dy) / 2, T(w, beta), atol=1e-8)


def test_frames():
    """eq:centre, eq:centred-frame, eq:gauge-frame, eq:potential-frames."""
    rng = np.random.default_rng(22)
    betas, y = random_state(rng, N, L, 4.0)
    beta = betas[0]
    w, zeta, z_const, z_node = ws_parts(y, beta)
    P = -zeta * w
    assert abs(barycenter(z_const) - P) < 1e-11
    assert np.allclose(T(P, z_const), zeta * np.exp(1j * beta), atol=1e-11)
    assert np.allclose(T_inv(w, np.conj(zeta) * z_const), np.exp(1j * beta), atol=1e-11)
    # the physical origin sits at w in the gauge frame
    assert abs(T_inv(w, 0) - w) < 1e-15

    z_all = np.append(z_const, z_node)
    f_phys = np.sum(log_poisson(P, z_all)) / N
    f_gauge = potential_gauge(abs(complex(y[0], y[1])), np.angle(complex(y[0], y[1])), beta, y[3] - y[2], N)
    assert f_phys == pytest.approx(-f_gauge, abs=1e-10)


def test_rho_rate():
    """eq:rho-dot — d rho/dt = -lam Re(e^{-i phi} q), and its late-time value."""
    res = run_reduced(20, 20, 1.0, 1.0, seed=0, n_frames=240)
    d = res["disks"][0]
    t, rho = np.array(res["times"]), np.array(d["rho"])
    delta = np.array(d["theta_node"]) - (np.array(d["alpha"]) + np.array(d["phi"]) + np.pi)
    late = t > 100
    rate = np.gradient(rho, t)[late]
    assert np.allclose(rate[1:-1], (1 - (1 - np.cos(delta[late])) / 20)[1:-1], atol=1e-6)
    # eq:deficit-late — collapsed cluster: 1 - |r|^2 = 4 (N - 1) sin^2(delta / 2) / N^2
    deficit = np.array(d["r_deficit"])[late]
    one_minus_r2 = 4 * 19 * np.sin(delta[late] / 2) ** 2 / 400
    assert np.allclose(deficit, one_minus_r2 / (1 + np.sqrt(1 - one_minus_r2)), rtol=1e-9)


def test_energy_is_a_gradient_flow():
    """eq:energy — theta' = -grad E, hence E' = -|theta'|^2."""
    rng = np.random.default_rng(23)
    W = build_dumbbell_adjacency(N, L, LAM, KAPPA)
    theta = rng.uniform(-np.pi, np.pi, 2 * N + L)
    h = 1e-6
    grad = np.array([
        (energy(theta + h * e, W) - energy(theta - h * e, W)) / (2 * h) for e in np.eye(theta.size)
    ])
    assert np.allclose(kuramoto_ode(0.0, theta, W), -grad, atol=1e-8)


def test_linearisation_at_synchrony_is_minus_laplacian():
    """eq:laplacian."""
    W = build_dumbbell_adjacency(N, L, LAM, KAPPA)
    V = 2 * N + L
    h = 1e-6
    J = np.array([
        (kuramoto_ode(0.0, h * e, W) - kuramoto_ode(0.0, -h * e, W)) / (2 * h) for e in np.eye(V)
    ]).T
    lap = np.diag(W.sum(axis=1)) - W
    assert np.allclose(J, -lap, atol=1e-8)
    assert np.all(np.linalg.eigvalsh(lap) > -1e-12)


def collapsed_rhs(x, lam, kappa, N):
    """Collapsed-cluster system: x = (Theta_1, theta_N, chain..., theta_{N+l+1}, Theta_2)."""
    out = np.zeros_like(x)
    pull = kappa * np.sin(np.diff(x[1:-1]))  # along node N, chain, node N+l+1
    out[1:-2] += pull
    out[2:-1] -= pull
    a, b = np.sin(x[1] - x[0]), np.sin(x[-2] - x[-1])
    out[0], out[-1] = lam / N * a, lam / N * b
    out[1] -= lam * (N - 1) / N * a
    out[-2] -= lam * (N - 1) / N * b
    return out


def test_collapsed_cluster_system():
    """eq:collapsed — exact when each cluster is one point; its slowest rate is lambda_2."""
    rng = np.random.default_rng(24)
    W = build_dumbbell_adjacency(N, L, LAM, KAPPA)
    x = rng.uniform(-1, 1, L + 4)
    theta = np.concatenate((np.full(N - 1, x[0]), x[1:-1], np.full(N - 1, x[-1])))
    full = kuramoto_ode(0.0, theta, W)
    red = collapsed_rhs(x, LAM, KAPPA, N)
    assert np.allclose(full[: N - 1], red[0], atol=1e-13)
    assert np.allclose(full[N - 1 : N + L + 1], red[1:-1], atol=1e-13)
    assert np.allclose(full[N + L + 1 :], red[-1], atol=1e-13)

    h = 1e-6
    J = np.array([
        (collapsed_rhs(h * e, LAM, KAPPA, N) - collapsed_rhs(-h * e, LAM, KAPPA, N)) / (2 * h)
        for e in np.eye(L + 4)
    ]).T
    rates = np.sort(-np.linalg.eigvals(J).real)
    assert abs(rates[0]) < 1e-8
    assert rates[1] == pytest.approx(fiedler(W), rel=1e-6)


def test_near_observed_states():
    """eq:state-one, eq:state-two — velocity fields of v0 (4.10) and (4.13)."""
    n, l, lam, kappa, A = 6, 5, 1.3, 0.7, 0.2
    W = build_dumbbell_adjacency(n, l, lam, kappa)
    V = 2 * n + l
    j = np.arange(1, V + 1)

    # clusters sit one step beyond the attached nodes (thesis indices N-1 and N+l+2)
    theta = A * np.clip(j, n - 1, n + l + 2)
    s = np.sin(A)
    expected = np.zeros(V)
    expected[: n - 1] = lam / n * s
    expected[n - 1] = (kappa - (n - 1) / n * lam) * s
    expected[n + l] = ((n - 1) / n * lam - kappa) * s
    expected[n + l + 1 :] = -lam / n * s
    assert np.allclose(kuramoto_ode(0.0, theta, W), expected, atol=1e-13)

    # clusters sit on the chain ends (thesis indices N+1 and N+l)
    theta = A * np.clip(j, n + 1, n + l)
    expected = np.zeros(V)
    expected[n], expected[n + l - 1] = kappa * s, -kappa * s
    assert np.allclose(kuramoto_ode(0.0, theta, W), expected, atol=1e-13)
