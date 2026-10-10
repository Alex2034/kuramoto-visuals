import numpy as np
import pytest

from kuramoto import build_dumbbell_adjacency, fiedler, integrate_full, kuramoto_ode
from mobius import T, T_inv, barycenter, potential_gauge, w_from_v
from reduced import (
    DISK, calibrate, cross_ratios, initial_state, integrate_reduced, reconstruct,
    reduced_rhs, run_reduced,
)

TIGHT = dict(rtol=1e-11, atol=1e-12, method="DOP853")


def random_state(rng, N, l, rho_max):
    """A reduced state that is not on any special manifold, with rho up to rho_max."""
    betas, disks = [], []
    for _ in range(2):
        z = np.exp(1j * rng.uniform(-np.pi, np.pi, N - 1))
        betas.append(np.angle(T(barycenter(z), z)))
        v = rng.uniform(0, rho_max) * np.exp(1j * rng.uniform(-np.pi, np.pi))
        disks.append([v.real, v.imag, *rng.uniform(-np.pi, np.pi, 2)])
    y = np.concatenate((disks[0], disks[1], rng.uniform(-np.pi, np.pi, l)))
    return betas, y


def pushed_forward(y, betas, lam, kappa, N, l, h=1e-6):
    """d/dt of all physical phases implied by the reduced flow (central difference along it)."""
    dy = reduced_rhs(0.0, y, betas, lam, kappa, N, l)
    plus = reconstruct(y + h * dy, betas, N, l)
    minus = reconstruct(y - h * dy, betas, N, l)
    return np.angle(np.exp(1j * (plus - minus))) / (2 * h)


@pytest.mark.parametrize("rho_max", [0.0, 1.0, 8.0, 30.0])
def test_reduced_rhs_is_the_full_rhs(rho_max):
    rng = np.random.default_rng(10)
    N, l, lam, kappa = 7, 5, 1.3, 0.7
    W = build_dumbbell_adjacency(N, l, lam, kappa)
    for _ in range(5):
        betas, y = random_state(rng, N, l, rho_max)
        theta = reconstruct(y, betas, N, l)
        assert np.allclose(
            pushed_forward(y, betas, lam, kappa, N, l), kuramoto_ode(0.0, theta, W), atol=1e-7
        )


def test_potential_rate_identity():
    """f' = -lam |r|^2 + (2 kappa / N) Im(conj(w) psi) sin(theta_N - theta_{N+1}) / (1 - |w|^2)."""
    rng = np.random.default_rng(11)
    N, l, lam, kappa = 7, 5, 1.3, 0.7

    def f_of(y, beta):
        v = complex(y[0], y[1])
        return potential_gauge(abs(v), np.angle(v), beta, y[3] - y[2], N)

    for _ in range(5):
        betas, y = random_state(rng, N, l, 3.0)
        dy = reduced_rhs(0.0, y, betas, lam, kappa, N, l)
        h = 1e-6
        f_dot = (f_of(y + h * dy, betas[0]) - f_of(y - h * dy, betas[0])) / (2 * h)

        w = w_from_v(complex(y[0], y[1]))
        zeta = np.exp(1j * y[2])
        z_const = zeta * T(w, np.exp(1j * betas[0]))
        z_node = np.exp(1j * y[3])
        r = (z_const.sum() + z_node) / N
        psi = T_inv(w, np.conj(zeta) * z_node)
        expected = -lam * abs(r) ** 2 + 2 * kappa / N * (np.conj(w) * psi).imag * np.sin(
            y[3] - y[2 * DISK]
        ) / (1 - abs(w) ** 2)
        assert f_dot == pytest.approx(expected, abs=1e-7)


def test_calibration_reproduces_initial_phases():
    rng = np.random.default_rng(12)
    N, l = 9, 6
    theta0 = rng.uniform(-np.pi, np.pi, 2 * N + l)
    betas, y0 = initial_state(theta0, N, l, "dumbbell")
    assert np.allclose(np.exp(1j * reconstruct(y0, betas, N, l)), np.exp(1j * theta0), atol=1e-12)
    for beta in betas:
        assert abs(np.exp(1j * beta).mean()) < 1e-13
    beta, d = calibrate(theta0[:N - 1], theta0[N - 1])
    assert d[2] == 0.0 and d[3] == theta0[N - 1]


def test_isolated_complete_graph():
    N, lam = 12, 1.0
    rng = np.random.default_rng(13)
    theta0 = rng.uniform(-np.pi, np.pi, N)
    W = lam / N * (np.ones((N, N)) - np.eye(N))
    betas, y0 = initial_state(theta0, N, 0, "complete")
    t = np.linspace(0, 20 / lam, 81)
    y = integrate_reduced(y0, betas, lam, 0.0, N, 0, t)
    full = integrate_full(theta0, W, t, **TIGHT)

    red = np.array([reconstruct(y[:, i], betas, N, 0) for i in range(len(t))]).T
    assert np.abs(np.exp(1j * red) - np.exp(1j * full)).max() < 1e-7

    # cross-ratios of the N-1 identical nodes are first integrals (eq. 2.2)
    cr_full = np.array([cross_ratios(np.exp(1j * full[:N - 1, i])) for i in range(len(t))])
    early = t <= 8 / lam
    assert np.abs(cr_full[early] / cr_full[0] - 1).max() < 1e-5
    cr_red = np.array([cross_ratios(np.exp(1j * red[:N - 1, i])) for i in np.flatnonzero(early)])
    assert np.abs(cr_red / cr_red[0] - 1).max() < 1e-5

    # node N is a constant of the ansatz too when kappa = 0, so f is a Lyapunov function
    rho, phi = np.hypot(y[0], y[1]), np.arctan2(y[1], y[0])
    f = np.array([potential_gauge(rho[i], phi[i], betas[0], y[3, i] - y[2, i], N) for i in range(len(t))])
    assert np.all(np.diff(f) < 0)


@pytest.mark.parametrize(
    "N,l,lam,kappa,seed",
    [(20, 20, 1.0, 1.0, 0), (20, 20, 1.0, 1.0, 42), (8, 12, 2.0, 0.5, 1), (15, 5, 0.5, 3.0, 2)],
)
def test_dumbbell_matches_full_system(N, l, lam, kappa, seed):
    res = run_reduced(N, l, lam, kappa, seed=seed, n_frames=240)
    tau = 1 / fiedler(build_dumbbell_adjacency(N, l, lam, kappa))
    assert res["times"][-1] == pytest.approx(3 * tau)
    assert max(res["residual"]) < 1e-7
    assert res["tau_fit"] is None  # the default run stops before the fit window [2 tau, 4 tau]
    long = run_reduced(N, l, lam, kappa, t_max=5 * tau, seed=seed, n_frames=240)
    assert max(long["residual"]) < 1e-7
    assert long["tau_fit"] == pytest.approx(tau, rel=0.01)
    chain = np.exp(1j * np.array(res["chain"]))
    assert np.allclose(res["chain_deficit"], 1 - np.abs(chain.mean(axis=1)), atol=1e-12)
    assert np.all(np.diff(res["energy"]) <= 1e-9)
    velocity_full = np.array([kuramoto_ode(0.0, np.array(th), build_dumbbell_adjacency(N, l, lam, kappa)) for th in res["full"]])
    assert np.allclose(res["velocity"], velocity_full, atol=1e-5)
    # eq:global-center: every frame is resolved on the default run and is balanced
    assert all(a is not None for a in res["global_angles"])
    balanced = np.exp(1j * np.array(res["global_angles"])).mean(axis=1)
    assert np.abs(balanced).max() < 1e-9
    # the global center is the barycenter of the full system's phases, frame by frame
    for i in (0, len(res["times"]) // 2, len(res["times"]) - 1):
        z_full = np.exp(1j * np.array(res["full"][i]))
        assert abs(barycenter(z_full) - complex(*res["global_center"][i])) < 1e-6
        # eq:chain-center
        z_chain = np.exp(1j * np.array(res["chain"][i]))
        assert abs(T(complex(*res["chain_center"][i]), z_chain).mean()) < 1e-9
    for disk in res["disks"]:
        deficit, r_abs = np.array(disk["r_deficit"]), np.array(disk["r_abs"])
        assert np.all(deficit > 0)
        assert np.allclose(deficit, 1 - r_abs, atol=1e-12)


@pytest.mark.parametrize("N,l", [(1, 1), (1, 6), (2, 1), (2, 3), (3, 2), (4, 1), (5, 1)])
def test_small_graphs(N, l):
    """Cliques with fewer than 3 identical nodes have no barycenter; the reduction must still be exact."""
    res = run_reduced(N, l, 1.0, 1.0, seed=3, n_frames=120)
    assert len(res["full"][0]) == 2 * N + l
    assert max(res["residual"]) < 1e-7
    assert np.all(np.diff(res["energy"]) <= 1e-9)
    for disk in res["disks"]:
        assert disk["canonical"] == (N >= 4)
        assert len(disk["beta"]) == N - 1
        for key in ("rho", "phi", "alpha", "theta_node", "r_abs", "r_deficit", "f"):
            assert np.all(np.isfinite(disk[key])), key
        assert np.all(np.isfinite(np.array(disk["mu"], dtype=float)))
        assert np.allclose(disk["r_deficit"], 1 - np.array(disk["r_abs"]), atol=1e-12)
    assert np.all(np.isfinite(res["velocity"]))
    assert all(c is None for c in res["chain_center"]) == (l < 3)


@pytest.mark.parametrize("N", [1, 2, 3, 4])
def test_small_complete_graphs(N):
    res = run_reduced(N, 0, 1.0, 0.0, seed=3, n_frames=60, mode="complete")
    assert len(res["full"][0]) == N
    assert max(res["residual"]) < 1e-7
    assert np.all(np.isfinite(res["disks"][0]["f"]))


def test_long_run_stays_finite():
    res = run_reduced(20, 20, 1.0, 1.0, t_max=1500.0, seed=0, n_frames=200)
    rho = np.array(res["disks"][0]["rho"])
    assert rho[-1] > 1400
    for disk in res["disks"]:
        for key in ("rho", "phi", "alpha", "theta_node", "r_abs", "r_deficit", "f", "mu"):
            assert np.all(np.isfinite(disk[key])), key
    assert np.all(np.isfinite(res["residual"]))
    assert max(res["residual"]) < 1e-7
