export interface SimulateParams {
  N: number;
  l: number;
  lambda_val: number;
  kappa: number;
  t_max: number;
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
