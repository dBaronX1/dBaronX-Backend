import { getCommerceAdminDashboard, getPlatformAdminPack } from "@/lib/platform/platform-api";
import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalMetricCard } from "@/components/platform/OperationalMetricCard";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default async function SettlementsPage() {
  const [commerce, pack] = await Promise.all([
    getCommerceAdminDashboard(),
    getPlatformAdminPack(),
  ]);

  const payments = (pack.summary?.payments ?? {}) as Record<string, unknown>;
  const paymentTotals = (payments.settlementTotals ?? {}) as Record<string, unknown>;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Settlements"
        title="Commerce and Checkout Settlement Surface"
        description="Operational settlement surface across checkout settlement, commerce settlement, and downstream distribution visibility."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OperationalMetricCard
          label="Commerce Gross"
          value={String(commerce.settlementTotals.gross)}
        />
        <OperationalMetricCard
          label="Supplier Cost"
          value={String(commerce.settlementTotals.supplierCost)}
        />
        <OperationalMetricCard
          label="Affiliate Commission"
          value={String(commerce.settlementTotals.affiliateCommission)}
        />
        <OperationalMetricCard
          label="Merchant Net"
          value={String(commerce.settlementTotals.merchantNet)}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Commerce Settlement Totals" payload={commerce.settlementTotals} />
        <JsonPanel title="Checkout Settlement Totals" payload={paymentTotals} />
      </section>

      <JsonPanel title="Recent Commerce Settlements" payload={commerce.recentSettlements} />
    </main>
  );
}
