// Disk automorphisms for the Watanabe–Strogatz views. Mirrors backend/mobius.py:
// T_p(z) = (z - p) / (1 - conj(p) z), w = tanh(rho/2) e^{i phi}, s = 1 - tanh(rho/2).

import type { DiskSeries } from "@/types/api";

export type Vec = { x: number; y: number };

export function sOfRho(rho: number): number {
  const e = Math.exp(-rho);
  return (2 * e) / (1 + e);
}

/** arg T_w(e^{i angle}) for w = tanh(rho/2) e^{i phi}; stable for large rho. */
export function tBoundary(rho: number, phi: number, angle: number): number {
  const s = sOfRho(rho);
  const g = angle - phi;
  const h = Math.sin(g / 2);
  // 1 - u, u = e^{i g}
  const omuRe = 2 * h * h;
  const omuIm = -Math.sin(g);
  const num = Math.atan2(-omuIm, s - omuRe);
  const den = Math.atan2(omuIm + s * Math.sin(g), omuRe + s * Math.cos(g));
  return phi + num - den;
}

export const onCircle = (angle: number): Vec => ({ x: Math.cos(angle), y: Math.sin(angle) });

export type DiskView = "physical" | "centered";

/** Phases of the N-1 identical nodes of a clique at frame i. */
export function clusterAngles(d: DiskSeries, i: number): number[] {
  return d.beta.map((b) => d.alpha[i] + tBoundary(d.rho[i], d.phi[i], b));
}

/** Conformal barycenter of the cluster, P = -zeta w. */
export function clusterCenter(d: DiskSeries, i: number): Vec {
  const r = 1 - sOfRho(d.rho[i]);
  const a = d.alpha[i] + d.phi[i] + Math.PI;
  return { x: r * Math.cos(a), y: r * Math.sin(a) };
}

/**
 * Map a physical boundary angle into the frame of disk d at frame i.
 * centered: T_P(z) = zeta T_{-w}(conj(zeta) z).
 */
export function toFrame(d: DiskSeries, i: number, view: DiskView, theta: number): number {
  if (view === "physical") return theta;
  return d.alpha[i] + tBoundary(d.rho[i], d.phi[i] + Math.PI, theta - d.alpha[i]);
}

/** Interior point through T_P (naive formula; only used for markers). */
export function mobiusPoint(p: Vec, z: Vec): Vec {
  const nx = z.x - p.x;
  const ny = z.y - p.y;
  const dx = 1 - (p.x * z.x + p.y * z.y);
  const dy = -(p.x * z.y - p.y * z.x);
  const m = dx * dx + dy * dy || 1e-300;
  return { x: (nx * dx + ny * dy) / m, y: (ny * dx - nx * dy) / m };
}

/** f(p) = (1/N) sum_j ln P(p, z_j) over boundary angles (eq. 2.12). */
export function potential(px: number, py: number, cos: Float64Array, sin: Float64Array, N: number): number {
  const one = 1 - px * px - py * py;
  let acc = 0;
  for (let j = 0; j < cos.length; j++) {
    const dx = px - cos[j];
    const dy = py - sin[j];
    acc += Math.log(one / (dx * dx + dy * dy));
  }
  return acc / N;
}

/**
 * SVG path of the hyperbolic geodesic between two boundary angles: the arc of the
 * circle orthogonal to the unit circle. toPx maps disk coordinates to pixels.
 */
export function geodesicPath(a: number, b: number, toPx: (v: Vec) => Vec, scale: number): string {
  const A = toPx(onCircle(a));
  const B = toPx(onCircle(b));
  let d = (b - a) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  const half = Math.abs(d) / 2;
  if (half < 1e-4) return "";
  if (Math.PI / 2 - half < 1e-3) return `M${A.x},${A.y}L${B.x},${B.y}`;
  const R = Math.tan(half) * scale;
  return `M${A.x},${A.y}A${R},${R} 0 0 ${d > 0 ? 1 : 0} ${B.x},${B.y}`;
}

/** log10 of s = 1 - tanh(rho/2), finite for any rho. */
export function log10s(rho: number): number {
  return (Math.LN2 - rho - Math.log1p(Math.exp(-rho))) / Math.LN10;
}
