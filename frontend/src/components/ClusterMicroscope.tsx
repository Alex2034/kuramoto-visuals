"use client";

import type { DiskSeries } from "@/types/api";
import { log10s } from "@/lib/mobius";

interface ClusterMicroscopeProps {
  disk: DiskSeries;
  frame: number;
  color: string;
  index: number;
}

const W = 520;
const H = 86;
const PAD = 24;
const TICKS = [-10, -3, -1, 0, 1, 3, 10];

// mu runs over the whole real line; atan compactifies it onto the strip
const xOf = (mu: number) => PAD + (Math.atan(mu) / Math.PI + 0.5) * (W - 2 * PAD);

/**
 * Internal shape of a collapsed cluster. Phase offsets from the cluster centre are
 * s * mu_j with s = 1 - |w|; the angles themselves lose this below machine precision.
 */
export default function ClusterMicroscope({ disk, frame, color, index }: ClusterMicroscopeProps) {
  const mu = disk.mu[frame] ?? [];
  const exponent = log10s(disk.rho[frame]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-baseline justify-between gap-4 text-sm">
        <span className="font-medium">Cluster {index + 1} microscope: offsets μ from the centre</span>
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
          <circle key={j} cx={xOf(m)} cy={44} r={5} fill={color} stroke="white" strokeWidth={2} opacity={0.9}>
            <title>{`node ${j + 1}: μ = ${m.toPrecision(4)}`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}
