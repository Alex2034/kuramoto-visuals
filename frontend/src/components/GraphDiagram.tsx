"use client";

import { CHAIN_COLOR, CLUSTER_COLORS, chainColor } from "@/components/PoincareDisk";
import type { ReducedMode } from "@/types/api";

interface GraphDiagramProps {
  N: number;
  l: number;
  mode: ReducedMode;
}

const W = 224;
const CX = 62;
const R = 36; // radius on which the nodes of a cluster are placed
const PAD = 10;
const MAX_CHAIN = 150; // the chain is drawn to scale only up to this length
const LABEL_X = CX + R + 16;

interface Node {
  x: number;
  y: number;
  color: string;
  attached?: boolean;
}

/** Nodes of a cluster on a circle; the last one is the attached node and faces the chain. */
function cluster(cy: number, n: number, facing: number, color: string, attach: boolean): Node[] {
  return Array.from({ length: n }, (_, j) => {
    const a = facing + (2 * Math.PI * (j + 1)) / n;
    return { x: CX + R * Math.cos(a), y: cy + R * Math.sin(a), color, attached: attach && j === n - 1 };
  });
}

/** The graph for the current parameters, top to bottom, in the node colors of the simulation. */
export default function GraphDiagram({ N, l, mode }: GraphDiagramProps) {
  const dumbbell = mode === "dumbbell";
  const step = Math.min(9, MAX_CHAIN / (l + 1));
  const cy1 = PAD + R;
  const cy2 = cy1 + 2 * R + (l + 1) * step;
  const height = (dumbbell ? cy2 : cy1) + R + PAD;

  const top = cluster(cy1, N, Math.PI / 2, CLUSTER_COLORS[0], dumbbell);
  const bottom = dumbbell ? cluster(cy2, N, -Math.PI / 2, CLUSTER_COLORS[1], true) : [];
  const from = top[top.length - 1];
  const to = bottom[bottom.length - 1];
  const chain: Node[] = dumbbell
    ? Array.from({ length: l }, (_, j) => ({ x: CX, y: from.y + (j + 1) * step, color: chainColor(j, l) }))
    : [];
  const r = Math.max(2, Math.min(4.5, (Math.PI * R) / Math.max(N, 1) - 0.5));
  const chainR = Math.max(1.5, Math.min(r, step / 2 - 0.3));
  const edgeOpacity = Math.min(0.5, 5 / Math.max(N, 1));

  const edges = (nodes: Node[], color: string) =>
    nodes.flatMap((a, i) =>
      nodes.slice(i + 1).map((b, j) => (
        <line key={`${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={0.5} opacity={edgeOpacity} />
      )),
    );
  const dot = (n: Node, id: string, radius: number) =>
    n.attached ? (
      <rect key={id} x={n.x - radius} y={n.y - radius} width={2 * radius} height={2 * radius} fill={n.color} />
    ) : (
      <circle key={id} cx={n.x} cy={n.y} r={radius} fill={n.color} />
    );
  const label = (y: number, first: string, second: string) => (
    <text x={LABEL_X} y={y} fontSize={12} fill="#52514e">
      <tspan x={LABEL_X}>{first}</tspan>
      <tspan x={LABEL_X} dy={15}>
        {second}
      </tspan>
    </text>
  );

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full">
        {edges(top, CLUSTER_COLORS[0])}
        {edges(bottom, CLUSTER_COLORS[1])}
        {dumbbell && <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={CHAIN_COLOR} strokeWidth={1} />}
        {top.map((n, i) => dot(n, `t${i}`, r))}
        {bottom.map((n, i) => dot(n, `b${i}`, r))}
        {chain.map((n, i) => dot(n, `c${i}`, chainR))}
        {label(cy1 - 4, `N = ${N}`, "edges: λ/N")}
        {dumbbell && (
          <>
            {label((from.y + to.y) / 2 - 4, `l = ${l}`, "edges: κ")}
            {label(cy2 - 4, `N = ${N}`, "edges: λ/N")}
          </>
        )}
      </svg>
    </div>
  );
}
