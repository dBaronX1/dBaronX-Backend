import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalTable } from "@/components/platform/OperationalTable";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { FRONTEND_NAVIGATION_AUDIT } from "@/lib/frontend/frontend-navigation-audit";

export const dynamic = "force-dynamic";

export default function NavigationAuditPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Navigation Audit"
        title="Frontend Navigation Audit Surface"
        description="Audit surface for route coverage across frontend launch, commerce, affiliate, watch, ads, AI Stories, Medusa, and launch-ops domains."
      />

      <LowBandwidthNotice />

      <OperationalTable
        title="Frontend Route Coverage"
        rows={FRONTEND_NAVIGATION_AUDIT}
        columns={[
          {
            key: "href",
            title: "Route",
            render: (row) => <span>{row.href}</span>,
          },
          {
            key: "category",
            title: "Category",
            render: (row) => <span>{row.category}</span>,
          },
          {
            key: "purpose",
            title: "Purpose",
            render: (row) => <span>{row.purpose}</span>,
          },
        ]}
      />
    </main>
  );
}
