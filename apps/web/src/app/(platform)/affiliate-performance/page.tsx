import { getPlatformAdminPack } from "@/lib/platform/platform-api";
import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalMetricCard } from "@/components/platform/OperationalMetricCard";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default async function AffiliatePerformancePage() {
  const pack = await getPlatformAdminPack();
  const payouts = (pack.summary?.payouts ?? {}) as Record<string, unknown>;
  const totals = (payouts.totals ?? {}) as Record<string, unknown>;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Affiliate Performance"
        title="Payout Performance and Outcome Surface"
        description="Performance-oriented affiliate frontend surface for payout outcomes and operational payout distribution."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 md:grid-cols-3">
        <OperationalMetricCard
          label="Requested"
          value={String(totals.totalRequested ?? 0)}
        />
        <OperationalMetricCard
          label="Settled"
          value={String(totals.totalSettled ?? 0)}
        />
        <OperationalMetricCard
          label="Rejected"
          value={String(totals.totalRejected ?? 0)}
        />
      </section>

      <JsonPanel
        title="Payout Status Distribution"
        payload={payouts.statusCounts ?? {}}
      />
    </main>
  );
}
