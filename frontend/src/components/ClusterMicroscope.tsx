"use client";

import type { DiskSeries } from "@/types/api";
import { log10s } from "@/lib/mobius";
import { Tex } from "@/components/Tex";

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
 * Internal shape of a collapsed cluster. Phase offsets from the cluster center are
 * s * mu_j with s = 1 - |w|; the angles themselves lose this below machine precision.
 */
export default function ClusterMicroscope({ disk, frame, color, index }: ClusterMicroscopeProps) {
  const mu = disk.mu[frame] ?? [];
  const exponent = log10s(disk.rho[frame]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-1 text-sm font-medium">Microscope: the inside of cluster {index + 1}</div>
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
      <p className="max-w-[520px] text-xs leading-relaxed text-gray-600">
        Once a cluster has collapsed, its <Tex>{"N-1"}</Tex> identical nodes agree to many digits, but their arrangement is
        still determined. Node <Tex>{"j"}</Tex> sits at the angle <Tex>{"s\\,\\mu_j"}</Tex> from the common phase of the
        cluster, where <Tex>{"s=1-|w|"}</Tex> is the distance of the cluster&apos;s M&ouml;bius parameter <Tex>{"w"}</Tex> from
        the unit circle; right now <Tex>{`s\\approx10^{${exponent.toFixed(1)}}`}</Tex> rad. The dots are the numbers{" "}
        <Tex>{"\\mu_j"}</Tex> (the axis is compressed so that <Tex>{"\\pm\\infty"}</Tex> fit): the cluster shrinks, its
        shape stays.
      </p>
    </div>
  );
}
