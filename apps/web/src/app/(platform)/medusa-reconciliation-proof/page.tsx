import { ContractRuleList } from "@/components/platform/ContractRuleList";
import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";
import { getMedusaReconciliationProof } from "@/lib/medusa/medusa-reconciliation-api";

export const dynamic = "force-dynamic";

export default async function MedusaReconciliationProofPage() {
  const payload = await getMedusaReconciliationProof();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Medusa Reconciliation Proof"
        title="Reconciliation Ownership Surface"
        description="Frontend proof surface showing that reconciliation, normalization, and settlement consequences stay in NestJS rather than Medusa."
      />

      <LowBandwidthNotice />

      <SurfaceTabs
        tabs={[
          { href: "/medusa-reconciliation-proof", label: "Reconciliation Proof" },
          { href: "/medusa-boundary-proof", label: "Boundary Proof" },
          { href: "/medusa-final-closure", label: "Final Closure" },
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel
          title="Reconciliation Ownership"
          payload={payload.medusaReconciliationProof.reconciliationOwnership}
        />
        <JsonPanel
          title="Medusa Role"
          payload={payload.medusaReconciliationProof.medusaRole}
        />
      </section>

      <ContractRuleList
        title="Reconciliation Rules"
        rules={payload.medusaReconciliationProof.rules}
      />
    </main>
  );
}
