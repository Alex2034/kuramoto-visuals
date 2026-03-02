"use client";

import type { Frame } from "@/types/api";

interface KuramotoVisualizationProps {
  frame: Frame | null;
  error: string | null;
}

const WIDTH = 600;
const HEIGHT = 600;
const CENTER = WIDTH / 2;
const SCALE = 200; // pixels per unit (radius 1 -> 200px)

function toSvg(x: number, y: number) {
  return { x: CENTER + x * SCALE, y: CENTER - y * SCALE };
}

export default function KuramotoVisualization({ frame, error }: KuramotoVisualizationProps) {
  if (error) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700">
        {error}
      </div>
    );
  }

  if (!frame) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-gray-500">
        Click &quot;Run simulation&quot; to start
      </div>
    );
  }

  const circleCenter = toSvg(0, 0);
  const circleR = SCALE;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 text-sm text-gray-600">
        Time: <span className="font-medium">{frame.t}</span>
      </div>
      <svg width={WIDTH} height={HEIGHT} className="overflow-visible">
        {/* Unit circle outline */}
        <circle
          cx={circleCenter.x}
          cy={circleCenter.y}
          r={circleR}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={2}
        />
        {/* Points */}
        {frame.points.map((pt) => {
          const { x, y } = toSvg(pt.x, pt.y);
          const color = pt.nodeType === "component" ? "#2563eb" : "#dc2626";
          return (
            <circle
              key={pt.index}
              cx={x}
              cy={y}
              r={6}
              fill={color}
              stroke="white"
              strokeWidth={2}
            >
              <title>{`Node ${pt.index} (${pt.nodeType})`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="mt-2 flex gap-4 text-xs text-gray-500">
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-600" />
          Components
        </span>
        <span>
          <span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-600" />
          Chain
        </span>
      </div>
    </div>
  );
}
