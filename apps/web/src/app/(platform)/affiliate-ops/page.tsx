import { getPlatformAdminPack } from "@/lib/platform/platform-api";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalMetricCard } from "@/components/platform/OperationalMetricCard";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { JsonPanel } from "@/components/platform/JsonPanel";

export const dynamic = "force-dynamic";

export default async function AffiliateOpsPage() {
  const pack = await getPlatformAdminPack();
  const payouts = (pack.summary?.payouts ?? {}) as Record<string, unknown>;

  const totalPayoutRequests =
    typeof payouts.totalPayoutRequests === "number"
      ? payouts.totalPayoutRequests
      : 0;

  const totals = (payouts.totals ?? {}) as Record<string, unknown>;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Affiliate Operations"
        title="Affiliate Review and Payout Surface"
        description="Operational affiliate surface for payout review, status visibility, and risk-aware handling."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OperationalMetricCard
          label="Payout Requests"
          value={totalPayoutRequests}
        />
        <OperationalMetricCard
          label="Total Requested"
          value={String(totals.totalRequested ?? 0)}
        />
        <OperationalMetricCard
          label="Total Settled"
          value={String(totals.totalSettled ?? 0)}
        />
        <OperationalMetricCard
          label="Total Rejected"
          value={String(totals.totalRejected ?? 0)}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel
          title="Payout Status Counts"
          payload={payouts.statusCounts ?? {}}
          description="Operational payout state distribution."
        />
        <JsonPanel
          title="Recent Payout Requests"
          payload={payouts.recentPayoutRequests ?? []}
          description="Most recent payout review items."
        />
      </section>
    </main>
  );
}
