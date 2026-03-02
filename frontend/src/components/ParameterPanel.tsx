"use client";

import type { SimulateParams } from "@/types/api";

interface ParameterPanelProps {
  params: SimulateParams;
  onChange: (params: SimulateParams) => void;
  onRun: () => void;
  loading: boolean;
}

export default function ParameterPanel({
  params,
  onChange,
  onRun,
  loading,
}: ParameterPanelProps) {
  const update = (key: keyof SimulateParams, value: number) => {
    onChange({ ...params, [key]: value });
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">Hyperparameters</h2>

      <div className="space-y-3">
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

        <label className="block">
          <span className="text-sm text-gray-600">Coupling in complete graphs (λ)</span>
          <input
            type="range"
            min={0}
            max={10}
            step={0.1}
            value={params.lambda_val}
            onChange={(e) => update("lambda_val", parseFloat(e.target.value))}
            className="mt-1 block w-full"
          />
          <span className="ml-2 text-sm font-medium">{params.lambda_val.toFixed(1)}</span>
        </label>

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
