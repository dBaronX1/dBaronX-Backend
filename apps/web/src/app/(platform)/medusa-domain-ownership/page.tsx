import { ContractRuleList } from "@/components/platform/ContractRuleList";
import { DomainOwnershipGrid } from "@/components/platform/DomainOwnershipGrid";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";
import { getMedusaClosureSnapshot } from "@/lib/medusa/medusa-closure-api";

export const dynamic = "force-dynamic";

export default async function MedusaDomainOwnershipPage() {
  const payload = await getMedusaClosureSnapshot();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Medusa Domain Ownership"
        title="Commerce-Only Domain Ownership Surface"
        description="Frontend Medusa closure surface for source-of-truth ownership and economic-logic exclusion."
      />

      <LowBandwidthNotice />

      <SurfaceTabs
        tabs={[
          { href: "/medusa-domain-ownership", label: "Domain Ownership" },
          { href: "/commerce-contracts", label: "Contracts" },
          { href: "/medusa-closure", label: "Closure" },
        ]}
      />

      <DomainOwnershipGrid domains={payload.medusaSyncContract.domains} />

      <ContractRuleList
        title="Prohibited Economic Logic"
        rules={payload.medusaSyncContract.prohibitedEconomicLogicInMedusa}
      />
    </main>
  );
}
