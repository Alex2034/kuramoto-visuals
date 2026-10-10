"use client";

import { useMemo, useState } from "react";
import type { ReducedResponse } from "@/types/api";
import type { DiskView } from "@/lib/mobius";
import PoincareDisk, { CHAIN_COLOR, CLUSTER_COLORS, chainColor, type DiskLayers } from "@/components/PoincareDisk";
import ClusterMicroscope from "@/components/ClusterMicroscope";
import TimeSeriesChart, { type BackgroundLine, type Mark, type Series } from "@/components/TimeSeriesChart";
import { Tex } from "@/components/Tex";

interface ReducedViewProps {
  data: ReducedResponse;
  frame: number;
}

const VIEWS: { id: DiskView; label: string }[] = [
  { id: "physical", label: "Physical" },
  { id: "centered", label: "Centered" },
];

const LAYERS: { id: keyof DiskLayers; label: string }[] = [
  { id: "potential", label: "Potential map" },
  { id: "geodesics", label: "Chain edges" },
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
    if (d.beta.length === 0) return; // a one-node clique has no cluster to pass through
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

/**
 * Angular velocities: one thin line per node, and the mean over each group
 * (the N nodes of a clique, the l nodes of the chain) as a series.
 */
function velocityCurves(data: ReducedResponse): { means: Series[]; nodes: BackgroundLine[] } {
  const { N, l } = data;
  const column = (j: number) => data.velocity.map((frame) => frame[j]);
  const range = (from: number, count: number) => Array.from({ length: count }, (_, j) => from + j);
  const groups =
    data.disks.length === 2
      ? [
          { name: "cluster 1", color: CLUSTER_COLORS[0], nodes: range(0, N), nodeColor: () => CLUSTER_COLORS[0] },
          { name: "cluster 2", color: CLUSTER_COLORS[1], nodes: range(N + l, N), nodeColor: () => CLUSTER_COLORS[1] },
          { name: "chain", color: CHAIN_COLOR, nodes: range(N, l), nodeColor: (j: number) => chainColor(j, l) },
        ]
      : [{ name: "cluster 1", color: CLUSTER_COLORS[0], nodes: range(0, N), nodeColor: () => CLUSTER_COLORS[0] }];
  const means: Series[] = [];
  const nodes: BackgroundLine[] = [];
  for (const g of groups) {
    const columns = g.nodes.map(column);
    columns.forEach((values, j) => nodes.push({ color: g.nodeColor(j), values }));
    means.push({
      name: `mean, ${g.name}`,
      color: g.color,
      values: data.times.map((_, f) => columns.reduce((acc, c) => acc + c[f], 0) / columns.length),
    });
  }
  return { means, nodes };
}

// in the units of the chart's 360-wide coordinate system
const CHART_HEIGHT = 126;

export default function ReducedView({ data, frame }: ReducedViewProps) {
  const [view, setView] = useState<DiskView>("physical");
  const [selected, setSelected] = useState<number | "all">(0);
  const [layers, setLayers] = useState<DiskLayers>({ potential: true, geodesics: true });

  const i = Math.min(frame, data.times.length - 1);
  // the view can be centered only on a cluster that has a barycenter; otherwise fall back to all nodes
  const dumbbell = data.disks.length > 1;
  const center: number | "all" =
    selected !== "all" && data.disks[Math.min(selected, data.disks.length - 1)].canonical
      ? Math.min(selected, data.disks.length - 1)
      : dumbbell
        ? "all"
        : 0;
  const crossings = useMemo(() => nodeCrossings(data), [data]);
  const velocity = useMemo(() => velocityCurves(data), [data]);
  const rhoSeries = useMemo(
    () =>
      data.disks.flatMap((d, idx) =>
        // w describes the identical nodes; a one-node clique has none
        d.beta.length === 0
          ? []
          : [
              {
                name: `ρ − λt, cluster ${idx + 1}`,
                color: CLUSTER_COLORS[idx],
                values: d.rho.map((rho, j) => rho - data.lambda_val * data.times[j]),
              },
            ],
      ),
    [data],
  );
  const deficitSeries = useMemo(
    () =>
      [
        ...data.disks.map((d, idx) => ({ name: `1 − |r|, cluster ${idx + 1}`, color: CLUSTER_COLORS[idx], values: d.r_deficit })),
        ...(data.chain_deficit.length > 0 ? [{ name: "1 − |r|, chain", color: CHAIN_COLOR, values: data.chain_deficit }] : []),
        // a group of one node has |r| = 1 identically: nothing to plot on a log axis
      ].filter((s) => s.values.some((v) => v > 0)),
    [data],
  );
  // the axis ends a decade below the smallest final value, so a zero crossing does not stretch it
  const finals = deficitSeries.map((s) => s.values[s.values.length - 1]).filter((v) => v > 0);
  const deficitFloor = finals.length > 0 ? Math.min(...finals) / 10 : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-gray-200 bg-white p-3 text-sm shadow-sm">
        <div className="flex gap-1">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`rounded-md px-3 py-1 font-medium ${view === v.id ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"}`}
            >
              {v.label}
            </button>
          ))}
        </div>
        {view === "centered" && dumbbell && (
          <label className="flex items-center gap-2 text-gray-600">
            Center
            <select
              value={center}
              onChange={(e) => setSelected(e.target.value === "all" ? "all" : parseInt(e.target.value, 10))}
              className="rounded border border-gray-300 px-1 py-0.5"
            >
              {data.disks.map((d, idx) =>
                d.canonical ? (
                  <option key={idx} value={idx}>
                    cluster {idx + 1}
                  </option>
                ) : null,
              )}
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
      </div>

      <div className="flex flex-col gap-4">
        {/* the disk and, beside it, the three charts stacked; the chart height is chosen so both columns end together */}
        <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
          <PoincareDisk data={data} frame={i} view={view} selected={center} layers={layers} />
          <div className="flex flex-col justify-between gap-4">
            <TimeSeriesChart title="Hyperbolic radius of the clusters, minus λt" times={data.times} series={rhoSeries} cursor={i} height={CHART_HEIGHT}>
              <Tex>{"|P|=\\tanh(\\rho/2)"}</Tex>, <Tex>{"P"}</Tex>: barycenter of a cluster
            </TimeSeriesChart>
            <TimeSeriesChart
              title="Distance from synchrony, 1 − |r| (log scale)"
              times={data.times}
              series={deficitSeries}
              cursor={i}
              logY
              yMin={deficitFloor}
              marks={crossings}
              marksNote="the attached node passes through its cluster"
              height={CHART_HEIGHT}
            >
              <Tex>{"r=\\frac1n\\sum_j\\e^{\\ii\\theta_j}"}</Tex> over the <Tex>{"n"}</Tex> nodes of a group
            </TimeSeriesChart>
            <TimeSeriesChart
              title="Angular velocities"
              times={data.times}
              series={velocity.means}
              background={velocity.nodes}
              cursor={i}
              height={CHART_HEIGHT}
            >
              <Tex>{"\\dot\\theta_j"}</Tex>: thin, every node; thick, mean over a group
            </TimeSeriesChart>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data.disks.map((d, idx) =>
            d.beta.length > 0 ? <ClusterMicroscope key={idx} disk={d} frame={i} color={CLUSTER_COLORS[idx]} index={idx} /> : null,
          )}
        </div>
      </div>
    </div>
  );
}
