import { ContractRuleList } from "@/components/platform/ContractRuleList";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";
import { getMedusaBoundaryProof } from "@/lib/medusa/medusa-boundary-api";

export const dynamic = "force-dynamic";

export default async function MedusaBoundaryProofPage() {
  const payload = await getMedusaBoundaryProof();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Medusa Boundary Proof"
        title="Commerce-Only Boundary Proof Surface"
        description="Frontend proof surface that Medusa remains commerce-only and excluded from economic decision ownership."
      />

      <LowBandwidthNotice />

      <SurfaceTabs
        tabs={[
          { href: "/medusa-boundary-proof", label: "Boundary Proof" },
          { href: "/medusa-domain-ownership", label: "Domain Ownership" },
          { href: "/medusa-normalization", label: "Normalization" },
          { href: "/medusa-closure", label: "Closure" },
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <ContractRuleList
          title="Allowed Responsibilities"
          rules={payload.medusaBoundaryProof.allowedResponsibilities}
        />
        <ContractRuleList
          title="Forbidden Responsibilities"
          rules={payload.medusaBoundaryProof.forbiddenResponsibilities}
        />
      </section>

      <ContractRuleList
        title="Proof Statements"
        rules={payload.medusaBoundaryProof.proofStatements}
      />
    </main>
  );
}
