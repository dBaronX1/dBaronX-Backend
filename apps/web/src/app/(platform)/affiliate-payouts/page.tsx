import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";
import { getPlatformAdminPack } from "@/lib/platform/platform-api";

export const dynamic = "force-dynamic";

export default async function AffiliatePayoutsPage() {
  const pack = await getPlatformAdminPack();
  const payouts = (pack.summary?.payouts ?? {}) as Record<string, unknown>;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Affiliate Payouts"
        title="Affiliate Payout State Surface"
        description="Frontend payout-state surface for affiliate review, operational status distribution, and payout outcome visibility."
      />

      <LowBandwidthNotice />

      <SurfaceTabs
        tabs={[
          { href: "/affiliate-dashboard", label: "Dashboard" },
          { href: "/affiliate-review", label: "Review" },
          { href: "/affiliate-payouts", label: "Payout States" },
          { href: "/affiliate-performance", label: "Performance" },
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Status Counts" payload={payouts.statusCounts ?? {}} />
        <JsonPanel
          title="Recent Payout Requests"
          payload={payouts.recentPayoutRequests ?? []}
        />
      </section>
    </main>
  );
}
