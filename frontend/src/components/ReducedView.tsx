"use client";

import { useMemo, useState } from "react";
import type { ReducedResponse } from "@/types/api";
import type { DiskView } from "@/lib/mobius";
import PoincareDisk, { CHAIN_COLOR, CLUSTER_COLORS, type DiskLayers } from "@/components/PoincareDisk";
import ClusterMicroscope from "@/components/ClusterMicroscope";
import TimeSeriesChart, { type Mark, type Series } from "@/components/TimeSeriesChart";

interface ReducedViewProps {
  data: ReducedResponse;
  frame: number;
}

const VIEWS: { id: DiskView; label: string; hint: string }[] = [
  { id: "physical", label: "Physical", hint: "Oscillators as they are, with the barycenters of each cluster, of the chain and of all nodes inside the disk." },
  { id: "centered", label: "Centered", hint: "Möbius-recentered at a cluster center (the cluster is the fixed constellation β rotated by ζ) or at the barycenter of all nodes." },
];

const LAYERS: { id: keyof DiskLayers; label: string }[] = [
  { id: "potential", label: "Potential f" },
  { id: "geodesics", label: "Chain geodesics" },
];

// a cluster narrower than e^-10 counts as collapsed
const COLLAPSED_RHO = 10;
const wrapAngle = (a: number) => a - 2 * Math.PI * Math.round(a / (2 * Math.PI));

/**
 * Instants at which the attached node passes through the phase of its collapsed cluster:
 * delta = theta_N - Theta changes sign, and 1 - |r| of that cluster drops to zero there.
 */
function nodeCrossings(data: ReducedResponse): Mark[] {
  const marks: Mark[] = [];
  data.disks.forEach((d, idx) => {
    const delta = d.theta_node.map((th, j) => wrapAngle(th - (d.alpha[j] + d.phi[j] + Math.PI)));
    for (let j = 0; j + 1 < delta.length; j++) {
      if (d.rho[j] < COLLAPSED_RHO || delta[j] * delta[j + 1] >= 0) continue;
      const u = delta[j] / (delta[j] - delta[j + 1]);
      const t = data.times[j] + u * (data.times[j + 1] - data.times[j]);
      marks.push({
        t,
        color: CLUSTER_COLORS[idx],
        label: `t = ${t.toPrecision(4)}: the attached node passes through cluster ${idx + 1}`,
      });
    }
  });
  return marks;
}

export default function ReducedView({ data, frame }: ReducedViewProps) {
  const [view, setView] = useState<DiskView>("physical");
  const [selected, setSelected] = useState<number | "all">(0);
  const [microCluster, setMicroCluster] = useState(0);
  const [layers, setLayers] = useState<DiskLayers>({ potential: true, geodesics: true });

  const i = Math.min(frame, data.times.length - 1);
  const k = selected === "all" ? 0 : Math.min(selected, data.disks.length - 1);
  const m = Math.min(microCluster, data.disks.length - 1);
  const perDisk = (pick: (d: ReducedResponse["disks"][number]) => number[], symbol: string): Series[] =>
    data.disks.map((d, idx) => ({ name: `${symbol}${idx + 1}`, color: CLUSTER_COLORS[idx], values: pick(d) }));

  const deficits = [...data.disks.map((d) => d.r_deficit), ...(data.chain_deficit.length > 0 ? [data.chain_deficit] : [])];
  // the axis ends a decade below the smallest final value, so a zero crossing does not stretch it
  const deficitFloor = Math.min(...deficits.map((v) => v[v.length - 1])) / 10;
  const crossings = useMemo(() => nodeCrossings(data), [data]);

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
        {view === "centered" && data.disks.length > 1 && (
          <label className="flex items-center gap-2 text-gray-600">
            Center
            <select
              value={selected === "all" ? "all" : k}
              onChange={(e) => setSelected(e.target.value === "all" ? "all" : parseInt(e.target.value, 10))}
              className="rounded border border-gray-300 px-1 py-0.5"
            >
              {data.disks.map((_, idx) => (
                <option key={idx} value={idx}>
                  cluster {idx + 1}
                </option>
              ))}
              <option value="all">all nodes</option>
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
          <PoincareDisk data={data} frame={i} view={view} selected={selected} layers={layers} />
          <div className="flex flex-col gap-4">
            <ClusterMicroscope
              disk={data.disks[m]}
              frame={i}
              color={CLUSTER_COLORS[m]}
              index={m}
              count={data.disks.length}
              onSelect={setMicroCluster}
            />
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
            title="Order-parameter deficit, 1 − |r| (log)"
            times={data.times}
            series={[
              ...perDisk((d) => d.r_deficit, "1 − |r|, cluster "),
              ...(data.chain_deficit.length > 0
                ? [{ name: "1 − |r|, chain", color: CHAIN_COLOR, values: data.chain_deficit }]
                : []),
            ]}
            cursor={i}
            logY
            yMin={deficitFloor}
            marks={crossings}
            marksNote="the attached node passes through its cluster (δ = 0): 1 − |r| of that cluster touches zero"
          />
        </div>
      </div>
    </div>
  );
}
