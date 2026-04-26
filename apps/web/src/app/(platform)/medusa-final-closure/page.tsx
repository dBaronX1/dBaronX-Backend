import { ContractRuleList } from "@/components/platform/ContractRuleList";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getMedusaBoundaryProof } from "@/lib/medusa/medusa-boundary-api";
import { getMedusaClosureSnapshot } from "@/lib/medusa/medusa-closure-api";

export const dynamic = "force-dynamic";

export default async function MedusaFinalClosurePage() {
  const [boundary, closure] = await Promise.all([
    getMedusaBoundaryProof(),
    getMedusaClosureSnapshot(),
  ]);

  const closed =
    boundary.medusaBoundaryProof.forbiddenResponsibilities.length > 0 &&
    closure.medusaSyncContract.prohibitedEconomicLogicInMedusa.length > 0;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Medusa Final Closure"
        title="Medusa Final Closure Surface"
        description="Closure-oriented surface for commerce-only boundary proof, forbidden responsibility exclusion, and sync-contract hardening."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Medusa closure"
        description={
          closed
            ? "Commerce-only boundary proof and prohibited economic logic surfaces are present."
            : "Medusa closure still requires additional proof or exclusion surfaces."
        }
        tone={closed ? "success" : "warning"}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <ContractRuleList
          title="Boundary Forbidden Responsibilities"
          rules={boundary.medusaBoundaryProof.forbiddenResponsibilities}
        />
        <ContractRuleList
          title="Contract Prohibited Economic Logic"
          rules={closure.medusaSyncContract.prohibitedEconomicLogicInMedusa}
        />
      </section>
    </main>
  );
}
