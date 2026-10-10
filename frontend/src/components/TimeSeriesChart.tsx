"use client";

import { useState } from "react";

export interface Series {
  name: string;
  color: string;
  values: number[];
  dashed?: boolean;
}

interface TimeSeriesChartProps {
  title: string;
  times: number[];
  series: Series[];
  /** Frame shown by the animation; drawn as a vertical cursor. */
  cursor: number;
  logY?: boolean;
}

const W = 360;
const H = 170;
const M = { left: 46, right: 10, top: 8, bottom: 22 };
const LOG_FLOOR = 1e-300;

function fmt(v: number): string {
  if (v === 0) return "0";
  const a = Math.abs(v);
  return a >= 1e4 || a < 1e-2 ? v.toExponential(1) : v.toPrecision(3);
}

export default function TimeSeriesChart({ title, times, series, cursor, logY = false }: TimeSeriesChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const tr = (v: number) => (logY ? Math.log10(Math.max(v, LOG_FLOOR)) : v);

  let lo = Infinity;
  let hi = -Infinity;
  for (const s of series) {
    for (const v of s.values) {
      if (!Number.isFinite(v)) continue;
      const u = tr(v);
      if (u < lo) lo = u;
      if (u > hi) hi = u;
    }
  }
  if (!Number.isFinite(lo)) [lo, hi] = [0, 1];
  if (hi - lo < 1e-12) [lo, hi] = [lo - 0.5, hi + 0.5];

  const t0 = times[0];
  const t1 = times[times.length - 1];
  const plotW = W - M.left - M.right;
  const plotH = H - M.top - M.bottom;
  const x = (t: number) => M.left + ((t - t0) / (t1 - t0 || 1)) * plotW;
  const yOf = (u: number) => H - M.bottom - ((u - lo) / (hi - lo)) * plotH;
  const y = (v: number) => yOf(tr(v));
  const tickLabel = (u: number) => (logY ? `1e${u.toFixed(0)}` : fmt(u));
  const ticks = [lo, (lo + hi) / 2, hi];

  const shown = Math.min(hover ?? cursor, times.length - 1);
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const t = t0 + ((((e.clientX - box.left) / box.width) * W - M.left) / plotW) * (t1 - t0);
    let best = 0;
    for (let i = 1; i < times.length; i++) if (Math.abs(times[i] - t) < Math.abs(times[best] - t)) best = i;
    setHover(best);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="text-sm font-medium">{title}</div>
      <div className="mb-1 flex flex-wrap gap-x-3 text-xs text-gray-600">
        <span>t = {fmt(times[shown])}</span>
        {series.map((s) => (
          <span key={s.name}>
            <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.name}: {fmt(s.values[shown])}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {ticks.map((u, i) => (
          <g key={i}>
            <line x1={M.left} x2={W - M.right} y1={yOf(u)} y2={yOf(u)} stroke="#e1e0d9" strokeWidth={1} />
            <text x={M.left - 4} y={yOf(u) + 3} textAnchor="end" fontSize={10} fill="#898781">
              {tickLabel(u)}
            </text>
          </g>
        ))}
        <text x={M.left} y={H - 6} fontSize={10} fill="#898781">
          {fmt(t0)}
        </text>
        <text x={W - M.right} y={H - 6} textAnchor="end" fontSize={10} fill="#898781">
          t = {fmt(t1)}
        </text>
        {series.map((s) => (
          <polyline
            key={s.name}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeDasharray={s.dashed ? "4 3" : undefined}
            strokeLinejoin="round"
            points={s.values.map((v, i) => `${x(times[i]).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}
          />
        ))}
        <line x1={x(times[shown])} x2={x(times[shown])} y1={M.top} y2={H - M.bottom} stroke="#52514e" strokeWidth={1} />
        {series.map((s) => (
          <circle key={s.name} cx={x(times[shown])} cy={y(s.values[shown])} r={4} fill={s.color} stroke="white" strokeWidth={2} />
        ))}
      </svg>
    </div>
  );
}
