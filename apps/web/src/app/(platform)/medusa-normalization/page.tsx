import { ContractRuleList } from "@/components/platform/ContractRuleList";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { NormalizationMatrix } from "@/components/platform/NormalizationMatrix";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";
import { getMedusaClosureSnapshot } from "@/lib/medusa/medusa-closure-api";

export const dynamic = "force-dynamic";

export default async function MedusaNormalizationPage() {
  const payload = await getMedusaClosureSnapshot();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Medusa Normalization"
        title="Fulfillment Provider and Status Normalization Surface"
        description="Frontend surface for Medusa fulfillment normalization mappings and policy rules."
      />

      <LowBandwidthNotice />

      <SurfaceTabs
        tabs={[
          { href: "/medusa-normalization", label: "Normalization" },
          { href: "/medusa-closure", label: "Closure" },
          { href: "/commerce-contracts", label: "Contracts" },
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <NormalizationMatrix
          title="Provider Normalization"
          mapping={payload.medusaFulfillmentNormalizationPolicy.providerNormalization}
        />
        <NormalizationMatrix
          title="Status Normalization"
          mapping={payload.medusaFulfillmentNormalizationPolicy.statusNormalization}
        />
      </section>

      <ContractRuleList
        title="Normalization Rules"
        rules={payload.medusaFulfillmentNormalizationPolicy.rules}
      />
    </main>
  );
}
