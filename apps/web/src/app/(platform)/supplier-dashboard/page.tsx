import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { MetricStrip } from "@/components/platform/MetricStrip";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getPlatformAdminPack } from "@/lib/platform/platform-api";

export const dynamic = "force-dynamic";

export default async function SupplierDashboardPage() {
  const pack = await getPlatformAdminPack();
  const suppliers = (pack.summary?.suppliers ?? {}) as Record<string, unknown>;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Supplier Dashboard"
        title="Supplier Lifecycle Dashboard"
        description="Frontend supplier dashboard for order count, status distribution, and settlement-state visibility."
      />

      <LowBandwidthNotice />

      <MetricStrip
        items={[
          { label: "Orders", value: String(suppliers.totalOrders ?? 0) },
          {
            label: "Status Types",
            value: Object.keys((suppliers.statusCounts ?? {}) as Record<string, unknown>).length,
          },
          {
            label: "Settlement Types",
            value: Object.keys((suppliers.settlementCounts ?? {}) as Record<string, unknown>).length,
          },
          {
            label: "Recent Orders",
            value: Array.isArray(suppliers.recentOrders) ? suppliers.recentOrders.length : 0,
          },
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Status Counts" payload={suppliers.statusCounts ?? {}} />
        <JsonPanel
          title="Settlement Counts"
          payload={suppliers.settlementCounts ?? {}}
        />
      </section>
    </main>
  );
}
