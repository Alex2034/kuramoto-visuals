"use client";

import { CHAIN_COLOR, CLUSTER_COLORS, chainColor } from "@/components/PoincareDisk";
import { Tex } from "@/components/Tex";
import type { ReducedMode } from "@/types/api";

interface GraphDiagramProps {
  N: number;
  l: number;
  mode: ReducedMode;
}

const W = 900;
const H = 150;
const R = 52; // radius on which the nodes of a clique are placed
const CY = 62;

interface Node {
  x: number;
  y: number;
  color: string;
  attached?: boolean;
}

/** Nodes of a clique on a circle; the attached node faces the chain (angle `facing`). */
function clique(cx: number, n: number, facing: number, color: string, attach: boolean): Node[] {
  return Array.from({ length: n }, (_, j) => {
    // the last node of the first clique and the first of the second are the attached ones
    const a = facing + (2 * Math.PI * (j + 1)) / n;
    return { x: cx + R * Math.cos(a), y: CY + R * Math.sin(a), color, attached: attach && j === n - 1 };
  });
}

/** The graph for the current parameters, with the node colors used in the simulation. */
export default function GraphDiagram({ N, l, mode }: GraphDiagramProps) {
  const dumbbell = mode === "dumbbell";
  const left = clique(dumbbell ? 70 : W / 2, N, 0, CLUSTER_COLORS[0], dumbbell);
  const right = dumbbell ? clique(W - 70, N, Math.PI, CLUSTER_COLORS[1], true) : [];
  const from = left[left.length - 1];
  const to = right[right.length - 1];
  const chain: Node[] = dumbbell
    ? Array.from({ length: l }, (_, j) => ({
        x: from.x + ((to.x - from.x) * (j + 1)) / (l + 1),
        y: CY,
        color: chainColor(j, l),
      }))
    : [];
  const path = dumbbell ? [from, ...chain, to] : [];
  const r = Math.max(2.5, Math.min(5, (Math.PI * R) / Math.max(N, 1) - 0.5));
  const edgeOpacity = Math.min(0.5, 5 / Math.max(N, 1));

  const edges = (nodes: Node[], color: string) =>
    nodes.flatMap((a, i) =>
      nodes.slice(i + 1).map((b, j) => (
        <line key={`${i}-${j}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={0.6} opacity={edgeOpacity} />
      )),
    );
  const dot = (n: Node, key: string) =>
    n.attached ? (
      <rect key={key} x={n.x - r} y={n.y - r} width={2 * r} height={2 * r} fill={n.color} />
    ) : (
      <circle key={key} cx={n.x} cy={n.y} r={r} fill={n.color} />
    );

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {edges(left, CLUSTER_COLORS[0])}
        {edges(right, CLUSTER_COLORS[1])}
        {path.slice(0, -1).map((a, i) => (
          <line key={`p${i}`} x1={a.x} y1={a.y} x2={path[i + 1].x} y2={path[i + 1].y} stroke={CHAIN_COLOR} strokeWidth={1.2} />
        ))}
        {left.map((n, i) => dot(n, `l${i}`))}
        {right.map((n, i) => dot(n, `r${i}`))}
        {chain.map((n, i) => dot({ ...n }, `c${i}`))}
        <text x={dumbbell ? 70 : W / 2} y={H - 8} textAnchor="middle" fontSize={12} fill="#52514e">
          cluster 1: N = {N}
        </text>
        {dumbbell && (
          <>
            <text x={W / 2} y={H - 8} textAnchor="middle" fontSize={12} fill="#52514e">
              chain: l = {l}
            </text>
            <text x={W - 70} y={H - 8} textAnchor="middle" fontSize={12} fill="#52514e">
              cluster 2: N = {N}
            </text>
          </>
        )}
      </svg>
      <p className="text-xs text-gray-600">
        Every node is an oscillator with a phase <Tex>{"\\theta_j"}</Tex>. Inside a cluster every pair of nodes is coupled
        with strength <Tex>{"\\lambda/N"}</Tex>
        {dumbbell ? (
          <>
            ; neighbors along the chain are coupled with strength <Tex>{"\\kappa"}</Tex>. Squares are the two nodes the chain
            is attached to.
          </>
        ) : (
          "."
        )}
      </p>
    </div>
  );
}
