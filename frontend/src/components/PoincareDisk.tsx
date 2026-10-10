"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ReducedResponse } from "@/types/api";
import {
  clusterAngles,
  clusterCenter,
  geodesicPath,
  mobiusPoint,
  onCircle,
  potential,
  toFrame,
  type DiskView,
  type Vec,
} from "@/lib/mobius";

export const CLUSTER_COLORS = ["#2a78d6", "#eb6834"];
// neutral ink for the chain as a whole (chart series, edges); its nodes are colored by position
export const CHAIN_COLOR = "#6f6e69";
const CHAIN_MID = [163, 162, 155];
const DOT_OPACITY = 0.75;

const rgbOf = (hex: string) => [1, 3, 5].map((o) => parseInt(hex.slice(o, o + 2), 16));

/**
 * Chain node j of l, colored by its position on the graph: cluster 1's color at
 * that end, a neutral gray in the middle, cluster 2's color at the other end.
 */
export function chainColor(j: number, l: number): string {
  const t = (j + 1) / (l + 1);
  const [from, to, u] = t < 0.5 ? [rgbOf(CLUSTER_COLORS[0]), CHAIN_MID, t * 2] : [CHAIN_MID, rgbOf(CLUSTER_COLORS[1]), t * 2 - 1];
  return `rgb(${from.map((c, k) => Math.round(c + (to[k] - c) * u)).join(",")})`;
}
const ALL_COLOR = "#52514e"; // neutral ink for the barycenter of all nodes

const SIZE = 520;
const CENTER = SIZE / 2;
const SCALE = 230; // pixels per unit (radius 1 -> 230px)
const GRID = 110; // potential heatmap resolution
const F_MIN = -2.5;
const F_MAX = 1;
// very light neutral ramp, white (low f) -> light gray (high f): a backdrop, hue is left to the nodes
const RAMP_LO = [255, 255, 255];
const RAMP_HI = [208, 207, 201];

const toPx = (v: Vec): Vec => ({ x: CENTER + v.x * SCALE, y: CENTER - v.y * SCALE });

export interface DiskLayers {
  potential: boolean;
  full: boolean;
  geodesics: boolean;
}

interface PoincareDiskProps {
  data: ReducedResponse;
  frame: number;
  view: DiskView;
  /** Whose center the centered view uses and whose potential is drawn: one cluster, or all nodes. */
  selected: number | "all";
  layers: DiskLayers;
}

interface Dot {
  id: string;
  angle: number;
  color: string;
  label: string;
  node?: boolean;
}

interface Marker {
  id: string;
  at: Vec;
  color: string;
  label: string;
}

interface Trail {
  id: string;
  points: string;
  color: string;
}

const polyline = (pts: Vec[]) =>
  pts
    .map(toPx)
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

export default function PoincareDisk({ data, frame, view, selected, layers }: PoincareDiskProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const i = Math.min(frame, data.times.length - 1);
  const all = selected === "all" && data.disks.length === 2;
  const k = selected === "all" ? 0 : Math.min(selected, data.disks.length - 1);
  const sel = data.disks[k];

  const scene = useMemo(() => {
    const dots: Dot[] = [];
    // boundary points that define the drawn potential f, and its normalization
    const own: number[] = [];
    const N = data.N;
    const globalAngles = all ? (data.global_angles[i] ?? null) : null;
    const globalCenter = data.global_center[i] ?? null;
    const centeredAll = all && view === "centered";
    const unresolved = centeredAll && globalAngles === null;

    // position of a node in the current frame; idx is its index in full-system order
    const place = (theta: number, idx: number) => {
      if (view === "physical") return theta;
      if (centeredAll) return globalAngles ? globalAngles[idx] : 0;
      return toFrame(sel, i, view, theta);
    };
    // full-system order: clique 1 identical nodes, its attached node, chain, attached node of clique 2, its identical nodes
    const offsets = [
      { consts: 0, node: N - 1 },
      { consts: N + data.l + 1, node: N + data.l },
    ];

    if (!unresolved) {
      data.disks.forEach((d, idx) => {
        const exact = view === "centered" && !all && idx === k;
        const physical = clusterAngles(d, i);
        // in the frame of its own cluster, T_P(z_j) = zeta beta_j exactly
        const consts = exact
          ? d.beta.map((b) => b + d.alpha[i])
          : physical.map((t, j) => place(t, offsets[idx].consts + j));
        const node = place(d.theta_node[i], offsets[idx].node);
        consts.forEach((angle, j) =>
          dots.push({ id: `c${idx}-${j}`, angle, color: CLUSTER_COLORS[idx], label: `Cluster ${idx + 1}, node ${j + 1}` }),
        );
        dots.push({
          id: `n${idx}`,
          angle: node,
          color: CLUSTER_COLORS[idx],
          label: `Cluster ${idx + 1}, node attached to the chain`,
          node: true,
        });
        if (all || idx === k) own.push(...consts, node);
      });
    }

    const chain = unresolved ? [] : (data.chain[i] ?? []).map((t, j) => place(t, N + j));
    chain.forEach((angle, j) => dots.push({ id: `ch${j}`, angle, color: chainColor(j, chain.length), label: `Chain node ${j + 1}` }));
    if (all) own.push(...chain);

    // chain edges as geodesics, including the two attached clique nodes
    let edges = "";
    if (layers.geodesics && data.disks.length === 2 && !unresolved) {
      const ends = data.disks.map((d, idx) => place(d.theta_node[i], offsets[idx].node));
      const path = [ends[0], ...chain, ends[1]];
      for (let j = 0; j + 1 < path.length; j++) edges += geodesicPath(path[j], path[j + 1], toPx, SCALE);
    }

    // interior markers and trails
    const markers: Marker[] = [];
    const trails: Trail[] = [];
    const pAll: Vec | null = globalCenter ? { x: globalCenter[0], y: globalCenter[1] } : null;
    if (view === "physical") {
      data.disks.forEach((d, idx) => {
        const pts: Vec[] = [];
        for (let t = 0; t <= i; t++) pts.push(clusterCenter(d, t));
        trails.push({ id: `t${idx}`, points: polyline(pts), color: CLUSTER_COLORS[idx] });
        markers.push({ id: `m${idx}`, at: pts[i], color: CLUSTER_COLORS[idx], label: `P${idx + 1}: center of cluster ${idx + 1}` });
      });
      if (pAll) markers.push({ id: "m-all", at: pAll, color: ALL_COLOR, label: "P_all: barycenter of all nodes" });
    } else if (centeredAll) {
      if (pAll) {
        markers.push({ id: "m-all", at: { x: 0, y: 0 }, color: ALL_COLOR, label: "P_all (view is centered here)" });
        data.disks.forEach((d, idx) => {
          const at = mobiusPoint(pAll, clusterCenter(d, i));
          markers.push({ id: `m${idx}`, at, color: CLUSTER_COLORS[idx], label: `P${idx + 1}: center of cluster ${idx + 1}` });
        });
      }
    } else {
      markers.push({ id: "m-own", at: { x: 0, y: 0 }, color: CLUSTER_COLORS[k], label: `P${k + 1} (view is centered here)` });
      data.disks.forEach((d, idx) => {
        if (idx === k) return;
        const at = mobiusPoint(clusterCenter(sel, i), clusterCenter(d, i));
        markers.push({ id: `m${idx}`, at, color: CLUSTER_COLORS[idx], label: `P${idx + 1}: center of cluster ${idx + 1}` });
      });
    }

    const full = layers.full && view === "physical" ? (data.full[i] ?? []) : [];
    const norm = all ? 2 * N + data.l : N;

    return { dots, own, norm, edges, markers, trails, full, unresolved };
  }, [data, i, view, k, sel, all, layers.geodesics, layers.full]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = ctx.createImageData(GRID, GRID);
    if (layers.potential) {
      const cos = Float64Array.from(scene.own, Math.cos);
      const sin = Float64Array.from(scene.own, Math.sin);
      for (let gy = 0; gy < GRID; gy++) {
        for (let gx = 0; gx < GRID; gx++) {
          const x = ((gx + 0.5) / GRID) * 2 - 1;
          const y = 1 - ((gy + 0.5) / GRID) * 2;
          if (x * x + y * y >= 1) continue;
          const f = potential(x, y, cos, sin, scene.norm);
          const u = Math.min(1, Math.max(0, (f - F_MIN) / (F_MAX - F_MIN)));
          const o = (gy * GRID + gx) * 4;
          for (let c = 0; c < 3; c++) img.data[o + c] = RAMP_LO[c] + (RAMP_HI[c] - RAMP_LO[c]) * u;
          img.data[o + 3] = 255;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [scene.own, scene.norm, layers.potential]);

  const c = toPx({ x: 0, y: 0 });

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <canvas
          ref={canvasRef}
          width={GRID}
          height={GRID}
          className="absolute rounded-full"
          style={{ left: CENTER - SCALE, top: CENTER - SCALE, width: 2 * SCALE, height: 2 * SCALE }}
        />
        <svg width={SIZE} height={SIZE} className="absolute left-0 top-0 overflow-visible">
          <circle cx={c.x} cy={c.y} r={SCALE} fill="none" stroke="#c3c2b7" strokeWidth={1.5} />
          {scene.edges && <path d={scene.edges} fill="none" stroke={CHAIN_COLOR} strokeWidth={1} opacity={0.4} />}
          {scene.trails.map((t) => (
            <polyline key={t.id} points={t.points} fill="none" stroke={t.color} strokeWidth={2} strokeLinejoin="round" />
          ))}
          {scene.full.map((theta, j) => {
            const p = toPx(onCircle(theta));
            return <circle key={`f${j}`} cx={p.x} cy={p.y} r={8} fill="none" stroke="#0b0b0b" strokeWidth={1} opacity={0.45} />;
          })}
          {scene.dots.map((dot) => {
            const p = toPx(onCircle(dot.angle));
            return dot.node ? (
              <rect key={dot.id} x={p.x - 5} y={p.y - 5} width={10} height={10} fill={dot.color} fillOpacity={DOT_OPACITY}>
                <title>{dot.label}</title>
              </rect>
            ) : (
              <circle key={dot.id} cx={p.x} cy={p.y} r={5} fill={dot.color} fillOpacity={DOT_OPACITY}>
                <title>{dot.label}</title>
              </circle>
            );
          })}
          {scene.unresolved && (
            <text x={c.x} y={c.y} textAnchor="middle" fontSize={14} fill="#52514e">
              All phases agree to within ~1e-6: this frame is no longer resolved
            </text>
          )}
          {scene.markers.map((m) => {
            const p = toPx(m.at);
            return (
              <circle key={m.id} cx={p.x} cy={p.y} r={7} fill="none" stroke={m.color} strokeWidth={2.5} pointerEvents="stroke">
                <title>{m.label}</title>
              </circle>
            );
          })}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        {data.disks.map((_, idx) => (
          <span key={idx}>
            <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: CLUSTER_COLORS[idx] }} />
            Cluster {idx + 1}
          </span>
        ))}
        {data.chain.length > 0 && (
          <span>
            <span
              className="mr-1 inline-block h-2 w-8 rounded-full align-middle"
              style={{ background: `linear-gradient(to right, ${CLUSTER_COLORS[0]}, rgb(${CHAIN_MID.join(",")}), ${CLUSTER_COLORS[1]})` }}
            />
            Chain, colored by position
          </span>
        )}
        <span>
          ■ {data.chain.length > 0 ? "node attached to the chain" : "node N"}
        </span>
        <span>
          ◎ {view === "physical" ? "cluster center P with trail" : "cluster centers"}
          {data.global_center.length > 0 ? "; gray: barycenter of all nodes" : ""}
        </span>
        {scene.full.length > 0 && <span>○ full system</span>}
        {layers.potential && (
          <span className="flex items-center gap-1">
            f, {all ? "all nodes" : `cluster ${k + 1}`}: {F_MIN}
            <span
              className="inline-block h-2 w-16"
              style={{ background: `linear-gradient(to right, rgb(${RAMP_LO.join(",")}), rgb(${RAMP_HI.join(",")}))` }}
            />
            {F_MAX}
          </span>
        )}
      </div>
    </div>
  );
}
