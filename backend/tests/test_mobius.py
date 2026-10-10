import mpmath as mp
import numpy as np
import pytest

from mobius import (
    T, T_inv, T_w_boundary, barycenter, microscope, s_of_rho, v_from_w, w_from_v,
)


def rand_disk(rng):
    return np.sqrt(rng.uniform(0, 0.95)) * np.exp(1j * rng.uniform(-np.pi, np.pi))


def rand_circle(rng, n):
    return np.exp(1j * rng.uniform(-np.pi, np.pi, n))


def test_inverse_and_circle_preserved():
    rng = np.random.default_rng(0)
    p, z = rand_disk(rng), rand_circle(rng, 50)
    assert np.allclose(np.abs(T(p, z)), 1, atol=1e-13)
    assert np.allclose(T_inv(p, T(p, z)), z, atol=1e-13)


def test_composition_is_rotation_times_automorphism():
    rng = np.random.default_rng(1)
    a, b, z = rand_disk(rng), rand_disk(rng), rand_circle(rng, 20)
    c = T_inv(a, b)  # T_b o T_a sends c to 0
    rot = (1 + np.conj(b) * a) / (1 + b * np.conj(a))
    assert np.allclose(T(b, T(a, z)), T(c, z) / rot * abs(rot) ** 2, atol=1e-12)


def test_v_w_roundtrip():
    rng = np.random.default_rng(2)
    w = rand_disk(rng)
    assert abs(w_from_v(v_from_w(w)) - w) < 1e-14
    assert w_from_v(0j) == 0 and v_from_w(0j) == 0


def test_stable_T_w_matches_naive():
    rng = np.random.default_rng(3)
    angles = rng.uniform(-np.pi, np.pi, 40)
    for rho in [0.0, 0.3, 2.0, 8.0, 20.0]:
        phi = rng.uniform(-np.pi, np.pi)
        w = np.tanh(rho / 2) * np.exp(1j * phi)
        naive = T(w, np.exp(1j * angles))
        assert np.allclose(T_w_boundary(rho, phi, angles), naive, atol=1e-7 if rho > 10 else 1e-12)


@pytest.mark.parametrize("rho", [50, 300, 1000])
def test_stable_T_w_matches_mpmath(rho):
    mp.mp.dps = 1000
    rng = np.random.default_rng(4)
    phi = rng.uniform(-np.pi, np.pi)
    for angle in rng.uniform(-np.pi, np.pi, 8):
        w = mp.tanh(mp.mpf(rho) / 2) * mp.expjpi(mp.mpf(phi) / mp.pi)
        beta = mp.expjpi(mp.mpf(angle) / mp.pi)
        exact = complex((beta - w) / (1 - mp.conj(w) * beta))
        assert abs(T_w_boundary(float(rho), phi, angle) - exact) < 1e-12


def test_barycenter_zero_mean_and_equivariance():
    rng = np.random.default_rng(5)
    for n in [4, 9, 19, 49]:
        z = rand_circle(rng, n)
        p = barycenter(z)
        assert abs(p) < 1
        assert abs(T(p, z).mean()) < 1e-13
        a, rot = rand_disk(rng), np.exp(1j * rng.uniform(-np.pi, np.pi))
        M = lambda x: rot * T(a, x)
        assert abs(barycenter(M(z)) - M(p)) < 1e-11


def test_barycenter_gauge_identities():
    """With bary(beta) = 0 and z = zeta T_w(beta): bary(z) = -zeta w and T_P(z) = zeta beta."""
    rng = np.random.default_rng(6)
    z0 = rand_circle(rng, 19)
    beta = T(barycenter(z0), z0)
    w, zeta = rand_disk(rng), np.exp(1j * rng.uniform(-np.pi, np.pi))
    z = zeta * T(w, beta)
    P = barycenter(z)
    assert abs(P + zeta * w) < 1e-12
    assert np.allclose(T(P, z), zeta * beta, atol=1e-11)


def test_microscope_definition_and_limit():
    rng = np.random.default_rng(7)
    beta, phi = rng.uniform(-np.pi, np.pi, 15), 0.4
    rho = 6.0
    offsets = np.angle(T_w_boundary(rho, phi, beta) / -np.exp(1j * phi))
    assert np.allclose(microscope(rho, phi, beta) * s_of_rho(rho), offsets, atol=1e-13)
    limit = -1 / np.tan((beta - phi) / 2)
    for rho in [60.0, 800.0, 1500.0]:
        mu = microscope(rho, phi, beta)
        assert np.all(np.isfinite(mu))
        assert np.allclose(mu, limit, rtol=1e-9)
