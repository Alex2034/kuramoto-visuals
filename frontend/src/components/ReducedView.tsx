"use client";

import { useMemo, useState } from "react";
import type { ReducedResponse } from "@/types/api";
import type { DiskView } from "@/lib/mobius";
import PoincareDisk, { CHAIN_COLOR, CLUSTER_COLORS, chainColor, type DiskLayers } from "@/components/PoincareDisk";
import ClusterMicroscope from "@/components/ClusterMicroscope";
import TimeSeriesChart, { type BackgroundLine, type Mark, type Series } from "@/components/TimeSeriesChart";
import { Formula, Tex } from "@/components/Tex";

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
  const residualTex = Math.max(...data.residual)
    .toExponential(0)
    .replace(/^(\d)e([+-]?)0*(\d+)$/, (_, m, sign, e) => `${m}\\cdot10^{${sign === "-" ? "-" : ""}${e}}`);
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
        <div className="flex flex-wrap items-start gap-4">
          <PoincareDisk data={data} frame={i} view={view} selected={center} layers={layers} />
          <div className="min-w-[280px] max-w-xl flex-1 rounded-lg border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-700 shadow-sm">
            <div className="mb-1 font-medium text-black">What you see</div>
            {view === "physical" ? (
              <>
                <p>
                  Every node is drawn on the unit circle at its phase, <Tex>{"z_j=\\e^{\\ii\\theta_j}"}</Tex>. The phases obey
                  the Kuramoto equations{" "}
                  <Tex>{"\\dot\\theta_i=\\sum_j a_{ij}\\sin(\\theta_j-\\theta_i)"}</Tex>, where <Tex>{"a_{ij}"}</Tex> is the
                  coupling of the edge between <Tex>{"i"}</Tex> and <Tex>{"j"}</Tex> shown in the graph above: every edge
                  pulls its two phases together.
                </p>
                <p>
                  The markers inside the disk are <em>conformal barycenters</em>. For points{" "}
                  <Tex>{"z_1,\\dots,z_n"}</Tex> on the circle this is the point <Tex>{"p"}</Tex> of the disk with
                </p>
                <Formula id="eq:barycenter" />
                <p>
                  where <Tex>{"\\T_p(z)=(z-p)/(1-\\conj p\\,z)"}</Tex> is the M&ouml;bius map that moves <Tex>{"p"}</Tex> to
                  the center. The barycenter sits near the center while the points are spread out and runs to the circle as
                  they gather. A colored ring is the barycenter of the <Tex>{"N-1"}</Tex> identical nodes of a cluster, the
                  gray ring that of the chain, the gray dot that of all nodes.
                </p>
              </>
            ) : center === "all" ? (
              <>
                <p>
                  The same instant, looked at through the M&ouml;bius map that moves the barycenter of all nodes,{" "}
                  <Tex>{"P_{\\mathrm{all}}"}</Tex>, to the center of the disk:
                </p>
                <Formula id="eq:mobius" />
                <Formula id="eq:global-center" />
                <p>
                  In this frame the nodes are always balanced around the center, so they cannot shrink to a point. When in
                  the physical view everything has gathered in a short arc, this view shows that arc magnified.
                </p>
              </>
            ) : (
              <>
                <p>
                  The same instant, looked at through the M&ouml;bius map that moves the barycenter{" "}
                  <Tex>{"P"}</Tex> of cluster {center + 1} to the center of the disk:
                </p>
                <Formula id="eq:mobius" />
                <p>
                  The <Tex>{"N-1"}</Tex> identical nodes of a cluster move by one common M&ouml;bius map of fixed points{" "}
                  <Tex>{"\\beta_j"}</Tex> (the Watanabe&ndash;Strogatz reduction), with <Tex>{"|\\zeta|=1"}</Tex> a rotation
                  and <Tex>{"w"}</Tex> a point of the disk:
                </p>
                <Formula id="eq:ws-ansatz" />
                <p>So in this frame the cluster is a rigid pattern that only rotates:</p>
                <Formula id="eq:centered-frame" />
                <p>Everything else is seen through the same lens and is pressed towards one point as the cluster collapses.</p>
              </>
            )}
            {layers.potential && (
              <>
                <p>
                  The gray map is the potential of the nodes named in the legend, built from the Poisson kernel{" "}
                  <Tex>{"P(p,z)=(1-|p|^2)/|p-z|^2"}</Tex>; it is darkest near the nodes and its maximum over the disk is
                  their barycenter:
                </p>
                <Formula id="eq:physical-potential" />
              </>
            )}
            <p className="mt-2 border-t border-gray-200 pt-2 text-xs text-gray-600">
              Time <Tex>{`t=${data.times[i].toPrecision(4)}`}</Tex>.
              {data.tau !== null && (
                <>
                  {" "}
                  Slow time scale of this graph: <Tex>{`\\tau=1/\\lambda_2=${data.tau.toPrecision(4)}`}</Tex>, where{" "}
                  <Tex>{"\\lambda_2"}</Tex> is the smallest nonzero eigenvalue of the graph Laplacian; near synchrony all
                  phase differences decay like <Tex>{"\\e^{-t/\\tau}"}</Tex>.
                </>
              )}{" "}
              The site integrates the reduced equations (see the tab &ldquo;The model&rdquo;); as a check, a direct integration
              of all {data.full[0].length} phases differs from it by at most{" "}
              <Tex>{`${residualTex}`}</Tex> over this run.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <TimeSeriesChart title="Hyperbolic radius of the clusters, minus λt" times={data.times} series={rhoSeries} cursor={i}>
            <Tex>{"\\rho"}</Tex> is the hyperbolic distance from the center of the disk to the barycenter <Tex>{"P"}</Tex> of a
            cluster, <Tex>{"|P|=\\tanh(\\rho/2)"}</Tex>; it is infinite on the circle. A collapsing cluster has{" "}
            <Tex>{"\\rho\\approx\\lambda t"}</Tex>, its width shrinking like <Tex>{"\\e^{-\\lambda t}"}</Tex>, so the
            curves level off.
          </TimeSeriesChart>
          <TimeSeriesChart
            title="How far each group is from synchrony, 1 − |r| (log scale)"
            times={data.times}
            series={deficitSeries}
            cursor={i}
            logY
            yMin={deficitFloor}
            marks={crossings}
            marksNote="the node attached to the chain passes through the phase of its cluster; for an instant that whole cluster is one point"
          >
            <Tex>{"r=\\frac1n\\sum_j\\e^{\\ii\\theta_j}"}</Tex> is the order parameter of a group of <Tex>{"n"}</Tex>{" "}
            nodes (a cluster with its attached node, or the chain); <Tex>{"|r|=1"}</Tex> means all its phases coincide.
          </TimeSeriesChart>
          <TimeSeriesChart
            title="Angular velocities"
            times={data.times}
            series={velocity.means}
            background={velocity.nodes}
            cursor={i}
          >
            Thin lines: <Tex>{"\\dot\\theta_j"}</Tex> of every node; thick lines: the average over each group. The vertical
            range follows the averages, so early peaks of single nodes are cut off.
          </TimeSeriesChart>
        </div>

        <div className="flex flex-wrap gap-4">
          {data.disks.map((d, idx) =>
            d.beta.length > 0 ? <ClusterMicroscope key={idx} disk={d} frame={i} color={CLUSTER_COLORS[idx]} index={idx} /> : null,
          )}
        </div>
      </div>
    </div>
  );
}
