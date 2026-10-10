"use client";

import { useState } from "react";
import type { ReducedResponse } from "@/types/api";
import type { DiskView } from "@/lib/mobius";
import PoincareDisk, { CLUSTER_COLORS, type DiskLayers } from "@/components/PoincareDisk";
import ClusterMicroscope from "@/components/ClusterMicroscope";
import TimeSeriesChart, { type Series } from "@/components/TimeSeriesChart";

interface ReducedViewProps {
  data: ReducedResponse;
  frame: number;
}

const VIEWS: { id: DiskView; label: string; hint: string }[] = [
  { id: "physical", label: "Physical", hint: "Oscillators as they are; ◎ is the conformal barycenter P = −ζw of each cluster." },
  { id: "centered", label: "Centered", hint: "Möbius-recentered at P: the cluster is the fixed constellation β rotated by ζ." },
];

const LAYERS: { id: keyof DiskLayers; label: string }[] = [
  { id: "potential", label: "Potential f" },
  { id: "geodesics", label: "Chain geodesics" },
  { id: "full", label: "Full-system overlay" },
];

export default function ReducedView({ data, frame }: ReducedViewProps) {
  const [view, setView] = useState<DiskView>("physical");
  const [selected, setSelected] = useState(0);
  const [layers, setLayers] = useState<DiskLayers>({ potential: true, full: false, geodesics: true });

  const i = Math.min(frame, data.times.length - 1);
  const k = Math.min(selected, data.disks.length - 1);
  const perDisk = (pick: (d: ReducedResponse["disks"][number]) => number[], symbol: string): Series[] =>
    data.disks.map((d, idx) => ({ name: `${symbol}${idx + 1}`, color: CLUSTER_COLORS[idx], values: pick(d) }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-sm">
        <div className="flex gap-1">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              title={v.hint}
              className={`rounded-md px-3 py-1 font-medium ${view === v.id ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"}`}
            >
              {v.label}
            </button>
          ))}
        </div>
        {data.disks.length > 1 && (
          <label className="flex items-center gap-2 text-gray-600">
            Cluster
            <select value={k} onChange={(e) => setSelected(parseInt(e.target.value, 10))} className="rounded border border-gray-300 px-1 py-0.5">
              {data.disks.map((_, idx) => (
                <option key={idx} value={idx}>
                  {idx + 1}
                </option>
              ))}
            </select>
          </label>
        )}
        {LAYERS.map((l) => (
          <label key={l.id} className="flex items-center gap-1 text-gray-600">
            <input type="checkbox" checked={layers[l.id]} onChange={(e) => setLayers({ ...layers, [l.id]: e.target.checked })} />
            {l.label}
          </label>
        ))}
        <span className="w-full text-xs text-gray-500">{VIEWS.find((v) => v.id === view)?.hint}</span>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start gap-4">
          <PoincareDisk data={data} frame={i} view={view} selected={k} layers={layers} />
          <div className="flex flex-col gap-4">
            <ClusterMicroscope disk={data.disks[k]} frame={i} color={CLUSTER_COLORS[k]} index={k} />
            <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600 shadow-sm">
              t = {data.times[i].toPrecision(5)}
              {data.tau !== null && (
                <>
                  {" "}
                  · τ = 1/λ₂ = {data.tau.toPrecision(5)}
                  {data.tau_fit !== null && <> · fitted τ = {data.tau_fit.toPrecision(5)}</>}
                </>
              )}{" "}
              · max |reduced − full| = {Math.max(...data.residual).toExponential(1)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TimeSeriesChart
            title="Hyperbolic radius minus its drift, ρ − λt"
            times={data.times}
            series={perDisk((d) => d.rho.map((rho, j) => rho - data.lambda_val * data.times[j]), "ρ − λt, cluster ")}
            cursor={i}
          />
          <TimeSeriesChart
            title="Cluster order-parameter deficit, 1 − |r| (log)"
            times={data.times}
            series={perDisk((d) => d.r_deficit, "1 − |r|, cluster ")}
            cursor={i}
            logY
          />
        </div>
      </div>
    </div>
  );
}
