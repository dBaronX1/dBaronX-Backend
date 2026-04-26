import { getPlatformAdminPack } from "@/lib/platform/platform-api";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalMetricCard } from "@/components/platform/OperationalMetricCard";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { JsonPanel } from "@/components/platform/JsonPanel";

export const dynamic = "force-dynamic";

export default async function SuppliersOpsPage() {
  const pack = await getPlatformAdminPack();
  const suppliers = (pack.summary?.suppliers ?? {}) as Record<string, unknown>;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Suppliers Operations"
        title="Supplier Lifecycle and Settlement Surface"
        description="Operational supplier surface for status, settlement, and order handling."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <OperationalMetricCard
          label="Total Orders"
          value={String(suppliers.totalOrders ?? 0)}
        />
        <OperationalMetricCard
          label="Status Types"
          value={Object.keys((suppliers.statusCounts ?? {}) as Record<string, unknown>).length}
        />
        <OperationalMetricCard
          label="Settlement Types"
          value={Object.keys((suppliers.settlementCounts ?? {}) as Record<string, unknown>).length}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Status Counts" payload={suppliers.statusCounts ?? {}} />
        <JsonPanel
          title="Settlement Counts"
          payload={suppliers.settlementCounts ?? {}}
        />
      </section>

      <JsonPanel title="Recent Orders" payload={suppliers.recentOrders ?? []} />
    </main>
  );
}
