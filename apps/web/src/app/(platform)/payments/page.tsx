import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalTable } from "@/components/platform/OperationalTable";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";
import { StatusPill } from "@/components/platform/StatusPill";
import { getPaymentStateDescriptor } from "@/lib/payments/payment-states";
import { getPlatformAdminPack } from "@/lib/platform/platform-api";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const pack = await getPlatformAdminPack();
  const payments = (pack.summary?.payments ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(payments.recentSettlements)
    ? (payments.recentSettlements as Record<string, unknown>[])
    : [];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Payments"
        title="Payment State and Settlement Surface"
        description="Frontend launch surface for checkout settlement visibility, payment-state presentation, and recent settlement review."
      />

      <LowBandwidthNotice />

      <SurfaceTabs
        tabs={[
          { href: "/payments", label: "Payments" },
          { href: "/orders", label: "Orders" },
          { href: "/settlements", label: "Settlements" },
          { href: "/payments-ops", label: "Payments Ops" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <JsonPanel
          title="Settlement Totals"
          payload={payments.settlementTotals ?? {}}
        />
        <JsonPanel
          title="Recent Preflights"
          payload={payments.recentPreflights ?? []}
        />
      </div>

      <OperationalTable
        title="Recent Checkout Settlements"
        rows={rows}
        columns={[
          {
            key: "order_id",
            title: "Order",
            render: (row) => <span>{String(row.order_id ?? "n/a")}</span>,
          },
          {
            key: "state",
            title: "State",
            render: () => {
              const descriptor = getPaymentStateDescriptor("settled");
              return (
                <div className="space-y-1">
                  <StatusPill
                    ready={descriptor.healthy}
                    readyLabel={descriptor.label}
                    blockedLabel={descriptor.label}
                  />
                  <p className="text-xs text-neutral-500">{descriptor.helper}</p>
                </div>
              );
            },
          },
          {
            key: "gross_amount",
            title: "Gross",
            render: (row) => <span>{String(row.gross_amount ?? 0)}</span>,
          },
          {
            key: "net_amount",
            title: "Net",
            render: (row) => <span>{String(row.net_amount ?? 0)}</span>,
          },
        ]}
      />
    </main>
  );
}
