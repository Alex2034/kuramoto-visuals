export interface SimulateParams {
  N: number;
  l: number;
  lambda_val: number;
  kappa: number;
  t_max: number;
  seed: number;
}

export interface Point {
  index: number;
  x: number;
  y: number;
  nodeType: "component" | "chain";
}

export interface Frame {
  t: number;
  points: Point[];
}

export interface SimulateResponse {
  times: number[];
  frames: Frame[];
}

export type ReducedMode = "dumbbell" | "complete";

export interface ReducedParams {
  mode: ReducedMode;
  N: number;
  l: number;
  lambda_val: number;
  kappa: number;
  t_max: number | null;
  n_frames: number;
  seed: number;
}

/** One clique in WS variables: w = tanh(rho/2) e^{i phi}, zeta = e^{i alpha}; arrays are per frame. */
export interface DiskSeries {
  beta: number[];
  rho: number[];
  phi: number[];
  alpha: number[];
  theta_node: number[];
  r_abs: number[];
  f: number[];
  mu: number[][];
  cross_ratio_drift: number[];
}

export interface ReducedResponse {
  mode: ReducedMode;
  N: number;
  l: number;
  times: number[];
  disks: DiskSeries[];
  chain: number[][];
  full: number[][];
  lambda2: number | null;
  tau: number | null;
  tau_fit: number | null;
  residual: number[];
  energy: number[];
  gap: number[];
}
