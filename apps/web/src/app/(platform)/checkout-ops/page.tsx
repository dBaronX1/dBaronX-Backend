import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { MetricStrip } from "@/components/platform/MetricStrip";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";
import { getPlatformAdminPack } from "@/lib/platform/platform-api";

export const dynamic = "force-dynamic";

export default async function CheckoutOpsPage() {
  const pack = await getPlatformAdminPack();
  const payments = (pack.summary?.payments ?? {}) as Record<string, unknown>;
  const totals = (payments.settlementTotals ?? {}) as Record<string, unknown>;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Checkout Operations"
        title="Checkout and Settlement Dashboard"
        description="Frontend checkout operations surface for settlement totals, preflight visibility, and payment-state monitoring."
      />

      <LowBandwidthNotice />

      <SurfaceTabs
        tabs={[
          { href: "/checkout-ops", label: "Checkout Ops" },
          { href: "/payments", label: "Payments" },
          { href: "/settlements", label: "Settlements" },
          { href: "/payments-ops", label: "Payments Ops" },
        ]}
      />

      <MetricStrip
        items={[
          {
            label: "Preflights",
            value: String(payments.preflightTraceCount ?? 0),
          },
          {
            label: "Settlements",
            value: String(payments.checkoutSettlementCount ?? 0),
          },
          {
            label: "Gross",
            value: String(totals.gross ?? 0),
          },
          {
            label: "Net",
            value: String(totals.net ?? 0),
          },
        ]}
      />

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
