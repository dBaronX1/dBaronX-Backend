import { getCommerceAdminDashboard } from "@/lib/platform/platform-api";
import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default async function CommerceReconciliationPage() {
  const commerce = await getCommerceAdminDashboard();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Commerce Reconciliation"
        title="Order, Variant, Fulfillment, and Settlement Reconciliation Surface"
        description="Operational reconciliation view over mirrored commerce records and settlement outputs."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Recent Orders" payload={commerce.recentOrders} />
        <JsonPanel title="Recent Fulfillments" payload={commerce.recentFulfillments} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Recent Variants" payload={commerce.recentVariants} />
        <JsonPanel title="Recent Settlements" payload={commerce.recentSettlements} />
      </section>
    </main>
  );
}
