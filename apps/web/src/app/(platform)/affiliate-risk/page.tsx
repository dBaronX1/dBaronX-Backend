import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";
import { getPlatformAdminPack } from "@/lib/platform/platform-api";

export const dynamic = "force-dynamic";

export default async function AffiliateRiskPage() {
  const pack = await getPlatformAdminPack();
  const payouts = (pack.summary?.payouts ?? {}) as Record<string, unknown>;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Affiliate Risk"
        title="Affiliate Review and Risk Surface"
        description="Frontend affiliate risk surface for payout-state distribution and operational review visibility."
      />

      <LowBandwidthNotice />

      <SurfaceTabs
        tabs={[
          { href: "/affiliate-dashboard", label: "Dashboard" },
          { href: "/affiliate-review", label: "Review" },
          { href: "/affiliate-risk", label: "Risk" },
          { href: "/affiliate-payouts", label: "Payout States" },
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel
          title="Status Counts"
          payload={payouts.statusCounts ?? {}}
          description="Payout-state distribution currently available to affiliate operations."
        />
        <JsonPanel
          title="Recent Review Items"
          payload={payouts.recentPayoutRequests ?? []}
          description="Recent payout items that may require review, approval, rejection, or settlement."
        />
      </section>
    </main>
  );
}
