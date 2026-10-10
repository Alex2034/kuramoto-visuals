"""
Disk automorphisms and hyperbolic-disk helpers for the Watanabe–Strogatz reduction.

Convention: T_p(z) = (z - p) / (1 - conj(p) z); the WS ansatz is z_j = zeta * T_w(beta_j)
with w = tanh(rho/2) * exp(i phi). Everything that touches w near the boundary is
written in terms of s = 1 - tanh(rho/2) so it stays accurate for rho in the hundreds.
"""
import numpy as np


def T(p, z):
    """Disk automorphism T_p(z) = (z - p) / (1 - conj(p) z)."""
    return (z - p) / (1 - np.conj(p) * z)


def T_inv(p, z):
    """Inverse of T_p, i.e. T_{-p}."""
    return T(-p, z)


def s_of_rho(rho):
    """s = 1 - tanh(rho/2), without cancellation."""
    e = np.exp(-rho)
    return 2 * e / (1 + e)


def log_one_minus_w2(rho):
    """ln(1 - |w|^2) for |w| = tanh(rho/2); finite for any rho."""
    return 2 * (np.log(2.0) - rho / 2 - np.log1p(np.exp(-rho)))


def w_from_v(v):
    """v = rho e^{i phi} (exponential coordinates at 0) -> w = tanh(rho/2) e^{i phi}."""
    rho = abs(v)
    if rho == 0:
        return 0j
    return np.tanh(rho / 2) * v / rho


def v_from_w(w):
    r = abs(w)
    if r == 0:
        return 0j
    return 2 * np.arctanh(r) * w / r


def one_minus_expi(gamma):
    """1 - e^{i gamma}, accurate for small gamma."""
    return -2j * np.sin(gamma / 2) * np.exp(0.5j * gamma)


def T_w_boundary(rho, phi, angle):
    """
    T_w(e^{i angle}) for w = tanh(rho/2) e^{i phi}, stable for large rho.
    Returns a unit complex number (array if angle is an array).
    """
    s = s_of_rho(rho)
    gamma = angle - phi
    omu = one_minus_expi(gamma)  # 1 - u
    u = 1 - omu
    return np.exp(1j * phi) * (s - omu) / (omu + s * u)


def barycenter(z, tol=1e-15, max_iter=200):
    """
    Conformal barycenter of boundary points z: the unique p in the disk with
    mean(T_p(z)) = 0. Newton step taken in the frame recentered at the current p.
    """
    z = np.asarray(z, dtype=complex)
    p = 0j
    for _ in range(max_iter):
        y = T(p, z)
        m = y.mean()
        if abs(m) < tol:
            return p
        B = (y * y).mean()
        denom = 1 - abs(B) ** 2
        d = (m + B * np.conj(m)) / denom if denom > 0 else m
        if abs(d) >= 1:
            d = m
        p = (d + p) / (1 + np.conj(p) * d)
    if abs(T(p, z).mean()) < 1e-10:
        return p
    raise ValueError("conformal barycenter did not converge (coincident points?)")


def log_poisson(p, z):
    """ln P(p, z), P(p, z) = (1 - |p|^2) / |p - z|^2 for |z| = 1."""
    return np.log1p(-abs(p) ** 2) - 2 * np.log(abs(p - z))


def potential(p, boundary, N):
    """f(p) = (1/N) * sum_j ln P(p, z_j) over the given boundary points (eq. 2.12)."""
    return float(np.sum(log_poisson(p, np.asarray(boundary))) / N)


def potential_gauge(rho, phi, beta_angles, node_angle, N):
    """
    f(w, psi) of eq. (2.12) in the gauge frame, w = tanh(rho/2) e^{i phi}:
    f = (1/N) [ sum_j ln P(w, beta_j) + ln P(w, psi) ].
    node_angle is arg(conj(zeta) z_N) = arg T_w(psi); ln P(w, psi) = -ln P(-w, T_w(psi))
    is used so that psi itself is never formed.
    """
    s = s_of_rho(rho)
    L = log_one_minus_w2(rho)
    const_part = np.sum(L - 2 * np.log(np.abs(one_minus_expi(beta_angles - phi) - s)))
    node_part = -L + 2 * np.log(abs(one_minus_expi(node_angle - phi - np.pi) - s))
    return float((const_part + node_part) / N)


def microscope(rho, phi, beta_angles):
    """
    Offsets of the cluster phases from the cluster center Theta = alpha + phi + pi,
    in units of s = 1 - tanh(rho/2): arg(z_j) - Theta = s * mu_j.
    As rho -> inf, mu_j -> -cot((beta_j - phi)/2).
    """
    s = s_of_rho(rho)
    omu = one_minus_expi(np.asarray(beta_angles) - phi)
    u = 1 - omu
    x = (1 + u) / (omu + s * u)
    sx = s * x
    small = np.abs(sx) < 1e-8
    safe_s = s if s > 0 else 1.0
    return np.where(small, -x.imag, np.angle(1 - np.where(small, 0, sx)) / safe_s)
