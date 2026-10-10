"use client";

import type { DiskSeries } from "@/types/api";
import { log10s } from "@/lib/mobius";

interface ClusterMicroscopeProps {
  disk: DiskSeries;
  frame: number;
  color: string;
  index: number;
  /** Number of clusters to choose from; the switch is shown when there is more than one. */
  count: number;
  onSelect: (index: number) => void;
}

const W = 520;
const H = 86;
const PAD = 24;
const TICKS = [-10, -3, -1, 0, 1, 3, 10];

// mu runs over the whole real line; atan compactifies it onto the strip
const xOf = (mu: number) => PAD + (Math.atan(mu) / Math.PI + 0.5) * (W - 2 * PAD);

/**
 * Internal shape of a collapsed cluster. Phase offsets from the cluster center are
 * s * mu_j with s = 1 - |w|; the angles themselves lose this below machine precision.
 */
export default function ClusterMicroscope({ disk, frame, color, index, count, onSelect }: ClusterMicroscopeProps) {
  const mu = disk.mu[frame] ?? [];
  const exponent = log10s(disk.rho[frame]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-baseline justify-between gap-4 text-sm">
        <span className="flex items-center gap-2 font-medium">
          Microscope: offsets μ from the center of cluster
          {count > 1 ? (
            <select value={index} onChange={(e) => onSelect(parseInt(e.target.value, 10))} className="rounded border border-gray-300 px-1 py-0.5 font-normal">
              {Array.from({ length: count }, (_, idx) => (
                <option key={idx} value={idx}>
                  {idx + 1}
                </option>
              ))}
            </select>
          ) : (
            index + 1
          )}
        </span>
        <span className="whitespace-nowrap text-gray-600">
          1 unit of μ = s = 10<sup>{exponent.toFixed(1)}</sup> rad
        </span>
      </div>
      <svg width={W} height={H}>
        <line x1={PAD} x2={W - PAD} y1={44} y2={44} stroke="#c3c2b7" strokeWidth={1} />
        {TICKS.map((t) => (
          <g key={t}>
            <line x1={xOf(t)} x2={xOf(t)} y1={40} y2={48} stroke="#c3c2b7" strokeWidth={1} />
            <text x={xOf(t)} y={64} textAnchor="middle" fontSize={11} fill="#898781">
              {t}
            </text>
          </g>
        ))}
        <text x={PAD} y={80} fontSize={11} fill="#898781">
          −∞
        </text>
        <text x={W - PAD} y={80} textAnchor="end" fontSize={11} fill="#898781">
          +∞
        </text>
        {mu.map((m, j) => (
          <circle key={j} cx={xOf(m)} cy={44} r={5} fill={color} fillOpacity={0.75}>
            <title>{`node ${j + 1}: μ = ${m.toPrecision(4)}`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}
