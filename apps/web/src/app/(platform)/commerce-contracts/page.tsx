import { ContractRuleList } from "@/components/platform/ContractRuleList";
import { DomainOwnershipGrid } from "@/components/platform/DomainOwnershipGrid";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { NormalizationMatrix } from "@/components/platform/NormalizationMatrix";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";
import { getCommerceSyncContract } from "@/lib/commerce/commerce-sync-contract-api";

export const dynamic = "force-dynamic";

export default async function CommerceContractsPage() {
  const payload = await getCommerceSyncContract();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Commerce Contracts"
        title="Medusa Sync Contract and Boundary Surface"
        description="Frontend contract surface for commerce-only Medusa boundaries, allowed sync domains, and fulfillment normalization."
      />

      <LowBandwidthNotice />

      <SurfaceTabs
        tabs={[
          { href: "/commerce-contracts", label: "Contracts" },
          { href: "/medusa-closure", label: "Medusa Closure" },
          { href: "/commerce-reconciliation", label: "Reconciliation" },
          { href: "/storefront-launch", label: "Storefront Launch" },
        ]}
      />

      <DomainOwnershipGrid domains={payload.medusaSyncContract.domains} />

      <section className="grid gap-4 lg:grid-cols-2">
        <ContractRuleList
          title="Prohibited Economic Logic in Medusa"
          rules={payload.medusaSyncContract.prohibitedEconomicLogicInMedusa}
        />
        <ContractRuleList
          title="Fulfillment Normalization Rules"
          rules={payload.medusaFulfillmentNormalizationPolicy.rules}
        />
      </section>

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
    </main>
  );
}
