import { Formula, Tex } from "@/components/Tex";

const REPO = "https://github.com/Alex2034/kuramoto-visuals";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 text-xl font-semibold text-black">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

/**
 * The introduction to the model. Displayed formulas come from source/main.tex by label,
 * so this page and the notes cannot disagree.
 */
export default function ModelIntro() {
  return (
    <article className="rounded-lg border border-gray-200 bg-white p-8 leading-relaxed text-gray-800 shadow-sm">
      <h1 className="text-2xl font-bold text-black">Kuramoto oscillators on a dumbbell graph</h1>
      <p className="mt-3">
        This site simulates coupled phase oscillators on a graph made of two complete graphs joined by a chain, and shows
        what happens to them on the hyperbolic disk. The page is a short tour of the mathematics; the full notes, with
        derivations, are the file <code>source/main.pdf</code> in the{" "}
        <a className="text-blue-700 underline" href={REPO}>
          repository
        </a>
        .
      </p>

      <Section title="1. The system">
        <p>
          The graph has two <em>clusters</em>, complete graphs (cliques) on <Tex>{"N"}</Tex> nodes each, and a{" "}
          <em>chain</em> of{" "}
          <Tex>{"l"}</Tex> nodes between them. The chain is attached to one node of each cluster; we call these two the{" "}
          <em>attached nodes</em> and the other <Tex>{"N-1"}</Tex> nodes of a cluster its <em>identical nodes</em>. Every
          node <Tex>{"i"}</Tex> carries a phase <Tex>{"\\theta_i"}</Tex>, and all oscillators have the same natural
          frequency, which a rotating frame removes. The phases obey
        </p>
        <Formula id="eq:full-system" />
        <p>
          so <Tex>{"\\lambda"}</Tex> is the coupling inside the clusters and <Tex>{"\\kappa"}</Tex> the coupling along the
          chain. Each term pulls two neighboring phases together. How synchronized a cluster is, is measured by its order
          parameter, the centroid of its <Tex>{"N"}</Tex> points on the unit circle (the same is used for the chain, with{" "}
          <Tex>{"l"}</Tex> points):
        </p>
        <Formula id="eq:order-parameter" />
      </Section>

      <Section title="2. Complex form">
        <p>
          Put <Tex>{"z_j=\\e^{\\ii\\theta_j}"}</Tex>, a point on the unit circle. A phase driven by a complex field{" "}
          <Tex>{"H"}</Tex> obeys a Riccati equation:
        </p>
        <Formula id="eq:riccati" />
        <p>
          In a cluster the field is <Tex>{"H=\\lambda r"}</Tex>, with <Tex>{"r"}</Tex> the order parameter of that cluster.
          The <Tex>{"N-1"}</Tex> identical nodes therefore obey <em>the same</em> equation with the same field,
        </p>
        <Formula id="eq:complex-identical" />
        <p>while the attached node feels the chain as well:</p>
        <Formula id="eq:complex-attached" />
      </Section>

      <Section title="3. One complete graph: the Möbius group">
        <p>
          Points on the circle that are driven by a common field move by a common M&ouml;bius map of the disk. Such a map
          is a rotation <Tex>{"\\zeta"}</Tex>, <Tex>{"|\\zeta|=1"}</Tex>, composed with
        </p>
        <Formula id="eq:mobius" />
        <p>
          for some point <Tex>{"w"}</Tex> of the open disk <Tex>{"\\D"}</Tex>. This is the Watanabe&ndash;Strogatz ansatz:
          the nodes are the images of fixed points <Tex>{"\\beta_j"}</Tex> on the circle,
        </p>
        <Formula id="eq:ws-ansatz" />
        <p>
          Here <Tex>{"\\zeta=\\e^{\\ii\\alpha}"}</Tex> rotates the whole configuration, and <Tex>{"w"}</Tex> says how
          strongly the pattern <Tex>{"\\beta"}</Tex> is squeezed: as <Tex>{"|w|\\to1"}</Tex> all points are pushed to the
          single point <Tex>{"-w/|w|"}</Tex>, which is full synchronization. Writing{" "}
          <Tex>{"q=\\conj\\zeta\\,r"}</Tex>, the ansatz solves the equations exactly when
        </p>
        <Formula id="eq:w-dot" />
        <Formula id="eq:alpha-dot" />
        <p>
          For an isolated complete graph <Tex>{"q"}</Tex> depends only on <Tex>{"w"}</Tex> and the constants, so{" "}
          <Tex>{"N"}</Tex> phases have been reduced to one point of the disk. Moreover the motion of <Tex>{"w"}</Tex> is a
          gradient flow for the hyperbolic metric of the disk. With the Poisson kernel
        </p>
        <Formula id="eq:poisson" />
        <p>and the potential and hyperbolic gradient</p>
        <Formula id="eq:potential-complete" />
        <p>one gets</p>
        <Formula id="eq:gradient-flow" />
        <p>
          The quantities that the flow cannot change are cross-ratios of the points, which every M&ouml;bius map preserves:
        </p>
        <Formula id="eq:cross-ratio" />
      </Section>

      <Section title="4. The dumbbell">
        <p>
          With the chain attached, the attached node leaves the common M&ouml;bius orbit, but the <Tex>{"N-1"}</Tex>{" "}
          identical nodes still follow the ansatz. So each cluster is described by <Tex>{"w"}</Tex>,{" "}
          <Tex>{"\\alpha"}</Tex> and the phase <Tex>{"\\theta_N"}</Tex> of its attached node, with
        </p>
        <Formula id="eq:q-def" />
        <p>The equations for <Tex>{"w"}</Tex> and <Tex>{"\\alpha"}</Tex> are as above, and</p>
        <Formula id="eq:node-dot" />
        <Formula id="eq:chain-dot" />
        <p>
          Together with the second cluster this is a system of <Tex>{"l+8"}</Tex> real variables instead of{" "}
          <Tex>{"2N+l"}</Tex>, and it is exact. It is the system this site integrates.
        </p>
      </Section>

      <Section title="5. Where is a cluster? The conformal barycenter">
        <p>
          The triple <Tex>{"(w,\\zeta,\\beta)"}</Tex> is not unique, so <Tex>{"w"}</Tex> by itself has no invariant
          meaning. A canonical point attached to a set of points <Tex>{"z_1,\\dots,z_n"}</Tex> on the circle is their{" "}
          <em>conformal barycenter</em>, the unique point <Tex>{"p"}</Tex> of the disk with
        </p>
        <Formula id="eq:barycenter" />
        <p>
          It commutes with M&ouml;bius maps. If the constants are chosen with barycenter at the origin, then the
          barycenter of the identical nodes of a cluster is at every time
        </p>
        <Formula id="eq:center" />
        <p>
          This is the colored ring in the simulation: it starts inside the disk and runs to the circle as the cluster
          collapses. Looking at the disk through the M&ouml;bius map that moves <Tex>{"P"}</Tex> to the center, the cluster
          becomes a rigid pattern that only rotates:
        </p>
        <Formula id="eq:centered-frame" />
        <p>
          That is the <em>Centered</em> view. Centering instead at the barycenter of all nodes,
        </p>
        <Formula id="eq:global-center" />
        <p>keeps the whole system balanced and shows the shape of the late, slow stage.</p>
      </Section>

      <Section title="6. Coordinates that survive the collapse">
        <p>
          Near synchronization <Tex>{"1-|w|"}</Tex> is exponentially small, so the equations are integrated in the
          hyperbolic distance <Tex>{"\\rho"}</Tex> from the center and the direction <Tex>{"\\varphi"}</Tex>:
        </p>
        <Formula id="eq:v-def" />
        <p>
          Let <Tex>{"\\Theta"}</Tex> be the phase of the cluster and <Tex>{"\\delta"}</Tex> the offset of its attached node:
        </p>
        <Formula id="eq:cluster-phase" />
        <p>Once the cluster has collapsed,</p>
        <Formula id="eq:rho-late" />
        <p>
          so <Tex>{"\\rho"}</Tex> grows like <Tex>{"\\lambda t"}</Tex> and the width of the cluster decays like{" "}
          <Tex>{"\\e^{-\\lambda t}"}</Tex>. Even when all phases of a cluster agree to machine precision, its internal
          arrangement is still known: with <Tex>{"s=1-|w|"}</Tex>, node <Tex>{"j"}</Tex> sits at the angle{" "}
          <Tex>{"s\\,\\mu_j"}</Tex> from <Tex>{"\\Theta"}</Tex>, and the numbers <Tex>{"\\mu_j"}</Tex> tend to a limit set by
          the constants (<Tex>{"\\gamma_j=\\arg\\beta_j-\\varphi"}</Tex>):
        </p>
        <Formula id="eq:microscope-limit" />
        <p>This is what the &ldquo;microscope&rdquo; under the charts shows.</p>
      </Section>

      <Section title="7. Two time scales">
        <p>The whole system is the gradient flow of an energy, which therefore always decreases:</p>
        <Formula id="eq:energy" />
        <p>
          Near full synchronization the phases relax according to the weighted graph Laplacian <Tex>{"L"}</Tex>,
        </p>
        <Formula id="eq:laplacian" />
        <p>and the slowest relaxation is set by its second eigenvalue:</p>
        <Formula id="eq:tau" />
        <p>
          So there are two stages. First the clusters collapse, at rate <Tex>{"\\lambda"}</Tex>. Then the two collapsed
          clusters and the chain between them relax together, at the much smaller rate <Tex>{"\\lambda_2"}</Tex>. In this
          second stage each cluster is a single phase <Tex>{"\\Theta_1"}</Tex> or <Tex>{"\\Theta_2"}</Tex>, and the system
          is exactly
        </p>
        <Formula id="eq:collapsed" />
        <p>
          The order parameter of a collapsed cluster then measures only the offset <Tex>{"\\delta"}</Tex> of its attached
          node:
        </p>
        <Formula id="eq:deficit-late" />
      </Section>

      <Section title="8. Reading the simulation">
        <p>
          <strong>The disk.</strong> Every node is drawn on the unit circle at its phase,{" "}
          <Tex>{"z_j=\\e^{\\ii\\theta_j}"}</Tex>; a node attached to the chain is a square, and chain nodes are colored
          by their position between the two clusters. The markers inside the disk are conformal barycenters: a colored
          ring for the <Tex>{"N-1"}</Tex> identical nodes of a cluster, a gray ring for the chain, a gray dot for all nodes.
          A barycenter sits near the center while its points are spread out and runs to the circle as they gather. The{" "}
          <em>Physical</em> view shows the nodes as they are. The <em>Centered</em> view shows the same instant through the
          M&ouml;bius map that moves the chosen barycenter to the center: centered on a cluster, that cluster is a rigid
          rotating pattern; centered on all nodes, the configuration stays balanced, so a short arc of nearly synchronized
          phases is shown magnified.
        </p>
        <p>
          <strong>The gray map</strong> is the potential built from the current positions of a group of{" "}
          <Tex>{"n"}</Tex> nodes with the Poisson kernel; it is darkest near the nodes, and its maximum over the disk is
          their barycenter:
        </p>
        <Formula id="eq:physical-potential" />
        <p>
          <strong>The charts.</strong> The first shows the hyperbolic distance <Tex>{"\\rho"}</Tex> of each cluster
          barycenter from the center of the disk, <Tex>{"|P|=\\tanh(\\rho/2)"}</Tex>, with its drift{" "}
          <Tex>{"\\lambda t"}</Tex> removed, so the curves level off once a cluster has collapsed. The second shows{" "}
          <Tex>{"1-|r|"}</Tex> for each cluster (with its attached node) and for the chain; zero means that all phases of
          the group coincide. A triangle on its time axis marks an instant when an attached node passes through the phase of
          its cluster: for that instant the whole cluster is one point and <Tex>{"1-|r|"}</Tex> touches zero. The third
          shows the angular velocity <Tex>{"\\dot\\theta_j"}</Tex> of every node as a thin line and the mean over each
          group as a thick one; its vertical range follows the means, so early peaks of single nodes are cut off.
        </p>
        <p>
          <strong>The microscope</strong> shows the numbers <Tex>{"\\mu_j"}</Tex> of section 6 for each cluster, on an
          axis compressed so that <Tex>{"\\pm\\infty"}</Tex> fit:
        </p>
        <Formula id="eq:microscope" />
        <p>
          <strong>Accuracy.</strong> The site integrates the reduced equations of section 4. In the tests of the
          repository a direct integration of all <Tex>{"2N+l"}</Tex> phases agrees with it to about{" "}
          <Tex>{"10^{-7}"}</Tex> over a whole run.
        </p>
      </Section>
    </article>
  );
}
