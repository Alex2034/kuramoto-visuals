export interface SimulateParams {
  N: number;
  l: number;
  lambda_val: number;
  kappa: number;
  t_max: number;
  seed: number;
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
  /** 1 - |r|, computed without cancellation. */
  r_deficit: number[];
  f: number[];
  mu: number[][];
  cross_ratio_drift: number[];
}

export interface ReducedResponse {
  mode: ReducedMode;
  N: number;
  l: number;
  lambda_val: number;
  kappa: number;
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
  /** 1 - |r| of the chain nodes alone. Empty in complete mode. */
  chain_deficit: number[];
  /** Conformal barycenter of all nodes per frame; null where it is not resolved. Empty in complete mode. */
  global_center: ([number, number] | null)[];
  /** Phases of all nodes in the frame centered at global_center, in full-system node order. */
  global_angles: (number[] | null)[];
  /** Conformal barycenter of the chain nodes per frame; null where it is not resolved. */
  chain_center: ([number, number] | null)[];
}
