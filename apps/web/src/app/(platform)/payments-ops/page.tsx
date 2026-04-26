import { getPlatformAdminPack } from "@/lib/platform/platform-api";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalMetricCard } from "@/components/platform/OperationalMetricCard";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { JsonPanel } from "@/components/platform/JsonPanel";

export const dynamic = "force-dynamic";

export default async function PaymentsOpsPage() {
  const pack = await getPlatformAdminPack();
  const payments = (pack.summary?.payments ?? {}) as Record<string, unknown>;
  const totals = (payments.settlementTotals ?? {}) as Record<string, unknown>;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Payments Operations"
        title="Checkout and Settlement Surface"
        description="Operational payment surface for preflight traces and checkout settlement visibility."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OperationalMetricCard
          label="Preflight Traces"
          value={String(payments.preflightTraceCount ?? 0)}
        />
        <OperationalMetricCard
          label="Settlements"
          value={String(payments.checkoutSettlementCount ?? 0)}
        />
        <OperationalMetricCard
          label="Gross"
          value={String(totals.gross ?? 0)}
        />
        <OperationalMetricCard
          label="Net"
          value={String(totals.net ?? 0)}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Settlement Totals" payload={totals} />
        <JsonPanel
          title="Recent Settlements"
          payload={payments.recentSettlements ?? []}
        />
      </section>
    </main>
  );
}
