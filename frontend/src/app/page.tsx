"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ParameterPanel from "@/components/ParameterPanel";
import KuramotoVisualization from "@/components/KuramotoVisualization";
import AnimationControls from "@/components/AnimationControls";
import type { SimulateParams, SimulateResponse } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [params, setParams] = useState<SimulateParams>({
    N: 20,
    l: 20,
    lambda_val: 1.0,
    kappa: 1.0,
    t_max: 1000,
  });
  const [data, setData] = useState<SimulateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runSimulation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || res.statusText || "Request failed");
      }
      const result: SimulateResponse = await res.json();
      setData(result);
      setCurrentFrame(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    if (!isPlaying || !data || data.frames.length === 0) return;
    intervalRef.current = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % data.frames.length);
    }, 100);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, data]);

  const frame = data?.frames[currentFrame] ?? null;

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <h1 className="mb-6 text-2xl font-bold">
        Evolution of Kuramoto System on Dumbbell Graph
      </h1>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full lg:w-64">
          <ParameterPanel
            params={params}
            onChange={setParams}
            onRun={runSimulation}
            loading={loading}
          />
        </aside>

        <div className="flex flex-1 flex-col gap-4">
          <KuramotoVisualization frame={frame} error={error} />
          <AnimationControls
            currentFrame={currentFrame}
            totalFrames={data?.frames.length ?? 0}
            isPlaying={isPlaying}
            onFrameChange={setCurrentFrame}
            onPlayPause={() => setIsPlaying((p) => !p)}
          />
        </div>
      </div>
    </main>
  );
}
