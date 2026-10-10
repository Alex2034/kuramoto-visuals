"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ParameterPanel, { type ReducedOptions } from "@/components/ParameterPanel";
import KuramotoVisualization from "@/components/KuramotoVisualization";
import ReducedView from "@/components/ReducedView";
import AnimationControls from "@/components/AnimationControls";
import type { ReducedParams, ReducedResponse, SimulateParams, SimulateResponse } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const REDUCED_FRAMES = 300;

type Tab = "circle" | "disk";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = typeof err.detail === "string" ? err.detail : err.detail?.[0]?.msg;
    throw new Error(detail || res.statusText || "Request failed");
  }
  return res.json();
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("circle");
  const [params, setParams] = useState<SimulateParams>({
    N: 20,
    l: 20,
    lambda_val: 1.0,
    kappa: 1.0,
    t_max: 1000,
    seed: 42,
  });
  const [reducedOptions, setReducedOptions] = useState<ReducedOptions>({ mode: "dumbbell", autoTime: true });
  const [data, setData] = useState<SimulateResponse | null>(null);
  const [reduced, setReduced] = useState<ReducedResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runSimulation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === "circle") {
        setData(await post<SimulateResponse>("/simulate", params));
      } else {
        const body: ReducedParams = {
          mode: reducedOptions.mode,
          N: params.N,
          l: params.l,
          lambda_val: params.lambda_val,
          kappa: params.kappa,
          t_max: reducedOptions.autoTime ? null : params.t_max,
          n_frames: REDUCED_FRAMES,
          seed: params.seed,
        };
        setReduced(await post<ReducedResponse>("/simulate/reduced", body));
      }
      setCurrentFrame(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      if (tab === "circle") setData(null);
      else setReduced(null);
    } finally {
      setLoading(false);
    }
  }, [tab, params, reducedOptions]);

  const totalFrames = tab === "circle" ? (data?.frames.length ?? 0) : (reduced?.times.length ?? 0);

  useEffect(() => {
    if (!isPlaying || totalFrames === 0) return;
    intervalRef.current = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % totalFrames);
    }, 100);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, totalFrames]);

  const frameIndex = Math.min(currentFrame, Math.max(totalFrames - 1, 0));
  const frame = data?.frames[frameIndex] ?? null;
  // the reduced grid is non-uniform, so show the time itself rather than a frame count
  const timeLabel = tab === "disk" && reduced ? `t = ${reduced.times[frameIndex].toPrecision(4)}` : undefined;

  const switchTab = (next: Tab) => {
    setTab(next);
    setError(null);
    setCurrentFrame(0);
  };

  return (
    <main className="min-h-screen bg-gray-100 p-6">
      <h1 className="mb-4 text-2xl font-bold">
        Evolution of Kuramoto System on Dumbbell Graph
      </h1>

      <div className="mb-6 flex gap-1">
        {(["circle", "disk"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium ${tab === t ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"}`}
          >
            {t === "circle" ? "Circle" : "Hyperbolic disk"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-64">
          <ParameterPanel
            params={params}
            onChange={setParams}
            onRun={runSimulation}
            loading={loading}
            reduced={tab === "disk" ? reducedOptions : undefined}
            onReducedChange={setReducedOptions}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <AnimationControls
            currentFrame={frameIndex}
            totalFrames={totalFrames}
            isPlaying={isPlaying}
            onFrameChange={setCurrentFrame}
            onPlayPause={() => setIsPlaying((p) => !p)}
            label={timeLabel}
          />
          {tab === "disk" && reduced && !error ? (
            <ReducedView data={reduced} frame={frameIndex} />
          ) : (
            <KuramotoVisualization frame={tab === "circle" ? frame : null} error={error} />
          )}
        </div>
      </div>
    </main>
  );
}
