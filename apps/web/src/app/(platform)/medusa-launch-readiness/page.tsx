import { ContractRuleList } from "@/components/platform/ContractRuleList";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getMedusaBoundaryProof } from "@/lib/medusa/medusa-boundary-api";
import { getMedusaClosureSnapshot } from "@/lib/medusa/medusa-closure-api";

export const dynamic = "force-dynamic";

export default async function MedusaLaunchReadinessPage() {
  const [boundary, closure] = await Promise.all([
    getMedusaBoundaryProof(),
    getMedusaClosureSnapshot(),
  ]);

  const forbiddenCount =
    boundary.medusaBoundaryProof.forbiddenResponsibilities.length;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Medusa Launch Readiness"
        title="Medusa Commerce-Only Launch Surface"
        description="Frontend launch-hardening surface for Medusa commerce-only boundary, normalization policy, and sync readiness."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Commerce-only boundary active"
        description={`Forbidden economic responsibilities tracked: ${forbiddenCount}. Source-of-truth domains remain restricted to catalog, variants, orders, and fulfillments.`}
        tone="success"
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <ContractRuleList
          title="Forbidden Responsibilities"
          rules={boundary.medusaBoundaryProof.forbiddenResponsibilities}
        />
        <ContractRuleList
          title="Normalization Rules"
          rules={closure.medusaFulfillmentNormalizationPolicy.rules}
        />
      </section>
    </main>
  );
}
