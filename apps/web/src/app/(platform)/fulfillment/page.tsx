import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { MetricStrip } from "@/components/platform/MetricStrip";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";
import { getStorefrontOrderSummary } from "@/lib/storefront/storefront-api";

export const dynamic = "force-dynamic";

export default async function FulfillmentPage() {
  const summary = await getStorefrontOrderSummary();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Fulfillment"
        title="Fulfillment Visibility Surface"
        description="Frontend fulfillment surface for order shipment visibility, fulfillment mirrors, and operational storefront monitoring."
      />

      <LowBandwidthNotice />

      <SurfaceTabs
        tabs={[
          { href: "/fulfillment", label: "Fulfillment" },
          { href: "/storefront-orders", label: "Storefront Orders" },
          { href: "/orders", label: "Orders" },
          { href: "/commerce-reconciliation", label: "Reconciliation" },
        ]}
      />

      <MetricStrip
        items={[
          { label: "Order Mirrors", value: summary.orderSyncCount },
          { label: "Fulfillment Mirrors", value: summary.fulfillmentSyncCount },
          { label: "Recent Orders", value: summary.recentOrders.length },
          {
            label: "Recent Fulfillments",
            value: summary.recentFulfillments.length,
          },
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Recent Orders" payload={summary.recentOrders} />
        <JsonPanel
          title="Recent Fulfillments"
          payload={summary.recentFulfillments}
        />
      </section>
    </main>
  );
}
