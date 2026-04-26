import { getPlatformAdminPack } from "@/lib/platform/platform-api";
import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalMetricCard } from "@/components/platform/OperationalMetricCard";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { StatusPill } from "@/components/platform/StatusPill";

export const dynamic = "force-dynamic";

export default async function AffiliateDashboardPage() {
  const pack = await getPlatformAdminPack();
  const shell = pack.shell;
  const payouts = (pack.summary?.payouts ?? {}) as Record<string, unknown>;
  const totals = (payouts.totals ?? {}) as Record<string, unknown>;
  const recent = Array.isArray(payouts.recentPayoutRequests)
    ? (payouts.recentPayoutRequests as Record<string, unknown>[])
    : [];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Affiliate Dashboard"
        title="Affiliate Revenue and Payout Operations"
        description="Frontend affiliate surface for payout outcomes, review readiness, and operator-visible economic state."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <OperationalMetricCard label="Platform Ready" value={shell.ready ? "YES" : "NO"} />
        <OperationalMetricCard
          label="Payout Requests"
          value={String(payouts.totalPayoutRequests ?? 0)}
        />
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

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Recent Affiliate Payout Requests</h2>
        </div>

        <div className="grid gap-3">
          {recent.slice(0, 8).map((row, index) => {
            const status = String(row.status ?? "unknown");
            return (
              <article
                key={`${row.id ?? "row"}-${index}`}
                className="rounded-2xl border p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{String(row.id ?? "n/a")}</p>
                    <p className="text-xs text-neutral-600">
                      {String(row.payout_method ?? "unknown method")}
                    </p>
                  </div>

                  <StatusPill
                    ready={status === "settled"}
                    readyLabel={status}
                    blockedLabel={status}
                  />
                </div>

                <div className="mt-3 grid gap-2 text-sm text-neutral-700 md:grid-cols-3">
                  <p>Amount: {String(row.amount ?? 0)}</p>
                  <p>Currency: {String(row.currency ?? "n/a")}</p>
                  <p>Created: {String(row.created_at ?? "n/a")}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <JsonPanel
        title="Payout Status Counts"
        payload={payouts.statusCounts ?? {}}
      />
    </main>
  );
}
