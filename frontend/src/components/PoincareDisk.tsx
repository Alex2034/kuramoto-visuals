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
export const CHAIN_COLOR = "#1baf7a";

const SIZE = 520;
const CENTER = SIZE / 2;
const SCALE = 230; // pixels per unit (radius 1 -> 230px)
const GRID = 110; // potential heatmap resolution
const F_MIN = -2.5;
const F_MAX = 1;
// neutral sequential ramp, light (low f) -> dark (high f); hue is left to the clusters
const RAMP_LO = [247, 247, 245];
const RAMP_HI = [137, 135, 129];

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
  /** Disk whose frame is used by the centered view, and whose potential is drawn. */
  selected: number;
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
  const k = Math.min(selected, data.disks.length - 1);
  const sel = data.disks[k];

  const scene = useMemo(() => {
    const dots: Dot[] = [];
    // boundary points of the selected clique in the current frame: they define f
    const own: number[] = [];

    data.disks.forEach((d, idx) => {
      const isSel = idx === k;
      let consts: number[];
      let node: number;
      if (view === "physical") {
        consts = clusterAngles(d, i);
        node = d.theta_node[i];
      } else if (isSel) {
        // T_P(z_j) = zeta beta_j exactly
        consts = d.beta.map((b) => b + d.alpha[i]);
        node = toFrame(d, i, view, d.theta_node[i]);
      } else {
        consts = clusterAngles(d, i).map((t) => toFrame(sel, i, view, t));
        node = toFrame(sel, i, view, d.theta_node[i]);
      }
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
      if (isSel) own.push(...consts, node);
    });

    const chain = (data.chain[i] ?? []).map((t) => toFrame(sel, i, view, t));
    chain.forEach((angle, j) => dots.push({ id: `ch${j}`, angle, color: CHAIN_COLOR, label: `Chain node ${j + 1}` }));

    // chain edges as geodesics, including the two attached clique nodes
    let edges = "";
    if (layers.geodesics && data.disks.length === 2) {
      const ends = data.disks.map((d) => toFrame(sel, i, view, d.theta_node[i]));
      const path = [ends[0], ...chain, ends[1]];
      for (let j = 0; j + 1 < path.length; j++) edges += geodesicPath(path[j], path[j + 1], toPx, SCALE);
    }

    // interior markers and trails
    const markers: Marker[] = [];
    const trails: Trail[] = [];
    if (view === "physical") {
      data.disks.forEach((d, idx) => {
        const pts: Vec[] = [];
        for (let t = 0; t <= i; t++) pts.push(clusterCenter(d, t));
        trails.push({ id: `t${idx}`, points: polyline(pts), color: CLUSTER_COLORS[idx] });
        markers.push({ id: `m${idx}`, at: pts[i], color: CLUSTER_COLORS[idx], label: `P${idx + 1}: center of cluster ${idx + 1}` });
      });
    } else {
      markers.push({ id: "m-own", at: { x: 0, y: 0 }, color: CLUSTER_COLORS[k], label: `P${k + 1} (view is centered here)` });
      data.disks.forEach((d, idx) => {
        if (idx === k) return;
        const at = mobiusPoint(clusterCenter(sel, i), clusterCenter(d, i));
        markers.push({ id: `m${idx}`, at, color: CLUSTER_COLORS[idx], label: `P${idx + 1}: center of cluster ${idx + 1}` });
      });
    }

    const full = layers.full && view === "physical" ? (data.full[i] ?? []) : [];

    return { dots, own, edges, markers, trails, full };
  }, [data, i, view, k, sel, layers.geodesics, layers.full]);

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
          const f = potential(x, y, cos, sin, data.N);
          const u = Math.min(1, Math.max(0, (f - F_MIN) / (F_MAX - F_MIN)));
          const o = (gy * GRID + gx) * 4;
          for (let c = 0; c < 3; c++) img.data[o + c] = RAMP_LO[c] + (RAMP_HI[c] - RAMP_LO[c]) * u;
          img.data[o + 3] = 255;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [scene.own, layers.potential, data.N]);

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
          {scene.edges && <path d={scene.edges} fill="none" stroke={CHAIN_COLOR} strokeWidth={1} opacity={0.55} />}
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
              <rect key={dot.id} x={p.x - 5} y={p.y - 5} width={10} height={10} fill={dot.color} stroke="white" strokeWidth={2}>
                <title>{dot.label}</title>
              </rect>
            ) : (
              <circle key={dot.id} cx={p.x} cy={p.y} r={5} fill={dot.color} stroke="white" strokeWidth={2}>
                <title>{dot.label}</title>
              </circle>
            );
          })}
          {scene.markers.map((m) => {
            const p = toPx(m.at);
            return (
              <circle key={m.id} cx={p.x} cy={p.y} r={7} fill="white" stroke={m.color} strokeWidth={3}>
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
            <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: CHAIN_COLOR }} />
            Chain
          </span>
        )}
        <span>
          ■ {data.chain.length > 0 ? "node attached to the chain" : "node N"}
        </span>
        <span>
          ◎ {view === "physical" ? "cluster center P with trail" : "cluster centers"}
        </span>
        {scene.full.length > 0 && <span>○ full system</span>}
        {layers.potential && (
          <span className="flex items-center gap-1">
            f, cluster {k + 1}: {F_MIN}
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
