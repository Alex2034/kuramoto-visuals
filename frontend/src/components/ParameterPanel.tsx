"use client";

import type { ReducedMode, SimulateParams } from "@/types/api";

export interface ReducedOptions {
  mode: ReducedMode;
  /** Use t_max = 3/lambda_2 (dumbbell) instead of the slider. */
  autoTime: boolean;
}

interface ParameterPanelProps {
  params: SimulateParams;
  onChange: (params: SimulateParams) => void;
  onRun: () => void;
  loading: boolean;
  /** Present only for the hyperbolic-disk tab. */
  reduced?: ReducedOptions;
  onReducedChange?: (options: ReducedOptions) => void;
}

export default function ParameterPanel({
  params,
  onChange,
  onRun,
  loading,
  reduced,
  onReducedChange,
}: ParameterPanelProps) {
  const update = (key: keyof SimulateParams, value: number) => {
    onChange({ ...params, [key]: value });
  };
  const complete = reduced?.mode === "complete";
  const autoTime = reduced?.autoTime ?? false;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">Hyperparameters</h2>

      <div className="space-y-3">
        {reduced && onReducedChange && (
          <label className="block">
            <span className="text-sm text-gray-600">Model</span>
            <select
              value={reduced.mode}
              onChange={(e) => onReducedChange({ ...reduced, mode: e.target.value as ReducedMode })}
              className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-sm"
            >
              <option value="dumbbell">Dumbbell (two disks + chain)</option>
              <option value="complete">Isolated complete graph</option>
            </select>
          </label>
        )}

        <label className="block">
          <span className="text-sm text-gray-600">Size of complete graphs (N)</span>
          <input
            type="range"
            min={5}
            max={50}
            value={params.N}
            onChange={(e) => update("N", parseInt(e.target.value, 10))}
            className="mt-1 block w-full"
          />
          <span className="ml-2 text-sm font-medium">{params.N}</span>
        </label>

        {!complete && (
          <label className="block">
            <span className="text-sm text-gray-600">Chain length (l)</span>
            <input
              type="range"
              min={5}
              max={50}
              value={params.l}
              onChange={(e) => update("l", parseInt(e.target.value, 10))}
              className="mt-1 block w-full"
            />
            <span className="ml-2 text-sm font-medium">{params.l}</span>
          </label>
        )}

        <label className="block">
          <span className="text-sm text-gray-600">Coupling in complete graphs (λ)</span>
          <input
            type="range"
            min={reduced ? 0.1 : 0}
            max={10}
            step={0.1}
            value={params.lambda_val}
            onChange={(e) => update("lambda_val", parseFloat(e.target.value))}
            className="mt-1 block w-full"
          />
          <span className="ml-2 text-sm font-medium">{params.lambda_val.toFixed(1)}</span>
        </label>

        {!complete && (
          <label className="block">
            <span className="text-sm text-gray-600">Coupling in chain (κ)</span>
            <input
              type="range"
              min={0}
              max={10}
              step={0.1}
              value={params.kappa}
              onChange={(e) => update("kappa", parseFloat(e.target.value))}
              className="mt-1 block w-full"
            />
            <span className="ml-2 text-sm font-medium">{params.kappa.toFixed(1)}</span>
          </label>
        )}

        {reduced && onReducedChange && (
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={reduced.autoTime}
              onChange={(e) => onReducedChange({ ...reduced, autoTime: e.target.checked })}
            />
            {complete ? "Automatic time (30/λ)" : "Automatic time (3/λ₂)"}
          </label>
        )}

        {!autoTime && (
          <label className="block">
            <span className="text-sm text-gray-600">Simulation time (T)</span>
            <input
              type="range"
              min={10}
              max={2000}
              step={10}
              value={params.t_max}
              onChange={(e) => update("t_max", parseInt(e.target.value, 10))}
              className="mt-1 block w-full"
            />
            <span className="ml-2 text-sm font-medium">{params.t_max}</span>
          </label>
        )}

        <label className="block">
          <span className="text-sm text-gray-600">Seed of initial phases</span>
          <input
            type="number"
            min={0}
            value={params.seed}
            onChange={(e) => update("seed", Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="mt-1 block w-full rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </label>
      </div>

      <button
        onClick={onRun}
        disabled={loading}
        className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Running..." : "Run simulation"}
      </button>
    </div>
  );
}
