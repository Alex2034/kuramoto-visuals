"use client";

import { useId, useMemo, useState } from "react";

export interface Series {
  name: string;
  color: string;
  values: number[];
  dashed?: boolean;
}

/** A thin, translucent curve drawn behind the series; it has no legend entry and does not set the y range. */
export interface BackgroundLine {
  color: string;
  values: number[];
}

/** An instant worth pointing at, drawn as a small triangle on the time axis. */
export interface Mark {
  t: number;
  color: string;
  label: string;
}

interface TimeSeriesChartProps {
  title: string;
  times: number[];
  series: Series[];
  /** Frame shown by the animation; drawn as a vertical cursor. */
  cursor: number;
  logY?: boolean;
  /** Lower end of the y axis; curves that go below it leave the plot through the bottom. */
  yMin?: number;
  background?: BackgroundLine[];
  marks?: Mark[];
  /** One-line explanation of the marks, shown under the plot when there are any. */
  marksNote?: string;
  /** What the chart shows, with every symbol defined; rendered under the plot. */
  children?: React.ReactNode;
  /** Height of the plot in the units of its 360-wide coordinate system. */
  height?: number;
}

const W = 360;
const M = { left: 46, right: 10, top: 8, bottom: 22 };
const LOG_FLOOR = 1e-300;
const NO_BACKGROUND: BackgroundLine[] = [];
const NO_MARKS: Mark[] = [];

function fmt(v: number): string {
  if (v === 0) return "0";
  const a = Math.abs(v);
  return a >= 1e4 || a < 1e-2 ? v.toExponential(1) : v.toPrecision(3);
}

/** Short form for the readout above the plot: two significant digits, at most 7 characters. */
function fmtShort(v: number): string {
  if (!Number.isFinite(v)) return "–";
  if (v === 0) return "0";
  const a = Math.abs(v);
  if (a >= 1e4 || a < 1e-2) return v.toExponential(1);
  return a >= 100 ? v.toFixed(0) : v.toPrecision(2);
}

export default function TimeSeriesChart({
  title,
  times,
  series,
  cursor,
  logY = false,
  yMin,
  background = NO_BACKGROUND,
  marks = NO_MARKS,
  marksNote,
  children,
  height: H = 170,
}: TimeSeriesChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const clipId = useId();

  // everything that does not depend on the cursor is computed once per data set
  const plot = useMemo(() => {
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
    if (yMin !== undefined && Number.isFinite(lo)) lo = Math.max(lo, tr(yMin));
    if (!Number.isFinite(lo)) [lo, hi] = [0, 1];
    if (hi - lo < 1e-12) [lo, hi] = [lo - 0.5, hi + 0.5];

    const t0 = times[0];
    const t1 = times[times.length - 1];
    const plotW = W - M.left - M.right;
    const plotH = H - M.top - M.bottom;
    const x = (t: number) => M.left + ((t - t0) / (t1 - t0 || 1)) * plotW;
    const yOf = (u: number) => H - M.bottom - ((u - lo) / (hi - lo)) * plotH;
    // far-off values are clipped by the plot area; keep the coordinates finite and short
    const y = (v: number) => Math.max(-H, Math.min(2 * H, yOf(tr(v))));
    const path = (values: number[]) => values.map((v, i) => `${x(times[i]).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
    return {
      lo,
      hi,
      t0,
      t1,
      plotW,
      plotH,
      x,
      y,
      yOf,
      lines: series.map((s) => path(s.values)),
      backgroundLines: background.map((b) => path(b.values)),
    };
  }, [times, series, background, logY, yMin, H]);

  const { lo, hi, t0, t1, plotW, plotH, x, y, yOf } = plot;
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
      {/* every value sits in a box of fixed width, so the entries do not move as the numbers change */}
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-sm font-medium">{title}</div>
        <div className="whitespace-nowrap text-xs tabular-nums text-gray-600">
          t = <span className="inline-block w-[7ch]">{fmtShort(times[shown])}</span>
        </div>
      </div>
      <div className="mb-1 flex flex-wrap gap-x-2 whitespace-nowrap text-xs tabular-nums text-gray-600">
        {series.map((s) => (
          <span key={s.name}>
            <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.name}: <span className="inline-block w-[7ch]">{fmtShort(s.values[shown])}</span>
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
        <clipPath id={clipId}>
          <rect x={M.left} y={M.top} width={plotW} height={plotH} />
        </clipPath>
        <g clipPath={`url(#${clipId})`} fill="none" strokeLinejoin="round">
          {background.map((b, i) => (
            <polyline key={i} stroke={b.color} strokeWidth={0.75} opacity={0.3} points={plot.backgroundLines[i]} />
          ))}
          {series.map((s, i) => (
            <polyline
              key={s.name}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? "4 3" : undefined}
              points={plot.lines[i]}
            />
          ))}
        </g>
        <line x1={x(times[shown])} x2={x(times[shown])} y1={M.top} y2={H - M.bottom} stroke="#52514e" strokeWidth={1} />
        {series.map((s) => (
          <circle
            key={s.name}
            cx={x(times[shown])}
            cy={Math.max(M.top, Math.min(y(s.values[shown]), H - M.bottom))}
            r={4}
            fill={s.color}
            stroke="white"
            strokeWidth={2}
          />
        ))}
        {marks.map((m, i) => {
          const px = x(m.t);
          const py = H - M.bottom;
          return (
            <path key={i} d={`M${px},${py - 1}l-4,-8h8z`} fill={m.color}>
              <title>{m.label}</title>
            </path>
          );
        })}
      </svg>
      {marks.length > 0 && marksNote && <div className="mt-1 text-xs text-gray-600">▼ {marksNote}</div>}
      {children && <div className="mt-1 text-xs leading-relaxed text-gray-600">{children}</div>}
    </div>
  );
}
