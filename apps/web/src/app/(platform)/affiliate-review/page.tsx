import { getPlatformAdminPack } from "@/lib/platform/platform-api";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalTable } from "@/components/platform/OperationalTable";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { StatusPill } from "@/components/platform/StatusPill";

export const dynamic = "force-dynamic";

export default async function AffiliateReviewPage() {
  const pack = await getPlatformAdminPack();
  const payouts = (pack.summary?.payouts ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(payouts.recentPayoutRequests)
    ? (payouts.recentPayoutRequests as Record<string, unknown>[])
    : [];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Affiliate Review"
        title="Payout Review Surface"
        description="Frontend operational review surface for affiliate payout state, approval flow, and rejection visibility."
      />

      <LowBandwidthNotice />

      <OperationalTable
        title="Recent Payout Requests"
        rows={rows}
        columns={[
          {
            key: "id",
            title: "ID",
            render: (row) => <span>{String(row.id ?? "n/a")}</span>,
          },
          {
            key: "status",
            title: "Status",
            render: (row) => (
              <StatusPill
                ready={String(row.status ?? "") === "settled"}
                readyLabel={String(row.status ?? "settled")}
                blockedLabel={String(row.status ?? "pending")}
              />
            ),
          },
          {
            key: "amount",
            title: "Amount",
            render: (row) => <span>{String(row.amount ?? 0)}</span>,
          },
          {
            key: "method",
            title: "Method",
            render: (row) => <span>{String(row.payout_method ?? "n/a")}</span>,
          },
          {
            key: "created_at",
            title: "Created",
            render: (row) => <span>{String(row.created_at ?? "n/a")}</span>,
          },
        ]}
      />
    </main>
  );
}
