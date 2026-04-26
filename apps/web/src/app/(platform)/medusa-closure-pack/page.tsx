import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";
import { getMedusaFinalClosurePack } from "@/lib/medusa/medusa-final-closure-api";

export const dynamic = "force-dynamic";

export default async function MedusaClosurePackPage() {
  const payload = await getMedusaFinalClosurePack();
  const pack = payload.medusaFinalClosurePack;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Medusa Closure Pack"
        title="Medusa Final Closure Pack Surface"
        description="Aggregate Medusa closure surface across boundary proof, reconciliation proof, sync contract and normalization policy."
      />

      <LowBandwidthNotice />

      <SurfaceTabs
        tabs={[
          { href: "/medusa-closure-pack", label: "Closure Pack" },
          { href: "/medusa-final-closure", label: "Final Closure" },
          { href: "/medusa-boundary-proof", label: "Boundary Proof" },
          { href: "/medusa-reconciliation-proof", label: "Reconciliation Proof" },
        ]}
      />

      <OperationalBanner
        title="Medusa closure state"
        description={
          pack.closed
            ? "Final Medusa closure pack currently reports closed."
            : "Final Medusa closure pack still reports open."
        }
        tone={pack.closed ? "success" : "warning"}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Boundary" payload={pack.boundary} />
        <JsonPanel title="Reconciliation" payload={pack.reconciliation} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Contract" payload={pack.contract} />
        <JsonPanel title="Normalization" payload={pack.normalization} />
      </section>
    </main>
  );
}
