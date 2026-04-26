import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getAffiliatePayoutOverview } from "@/lib/affiliate/affiliate-api";

export const dynamic = "force-dynamic";

export default async function AffiliateMobilePage() {
  const payouts = await getAffiliatePayoutOverview();
  const totals = payouts.totals;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-5">
      <SectionHeader
        eyebrow="Affiliate Mobile"
        title="Mobile Affiliate Surface"
        description="Compressed affiliate payout and review visibility for smaller screens and reduced data conditions."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Payout overview"
        description={`Requested: ${totals.totalRequested} • Settled: ${totals.totalSettled} • Rejected: ${totals.totalRejected}`}
      />

      <section className="space-y-3">
        {payouts.recentPayoutRequests.slice(0, 8).map((row, index) => (
          <article
            key={`${String(row.id ?? index)}`}
            className="rounded-2xl border bg-white p-4 shadow-sm"
          >
            <p className="text-sm font-semibold">{String(row.id ?? "n/a")}</p>
            <p className="mt-1 text-xs text-neutral-600">
              amount: {String(row.amount ?? 0)}
            </p>
            <p className="mt-1 text-xs text-neutral-600">
              status: {String(row.status ?? "unknown")}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
