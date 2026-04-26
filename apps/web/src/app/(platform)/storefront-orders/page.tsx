import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { StorefrontOrderCards } from "@/components/platform/StorefrontOrderCards";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";
import { getStorefrontOrderSummary } from "@/lib/storefront/storefront-api";

export const dynamic = "force-dynamic";

export default async function StorefrontOrdersPage() {
  const summary = await getStorefrontOrderSummary();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Storefront Orders"
        title="Operational Order State Surface"
        description="Frontend order surface for mirrored orders, fulfillment state, and storefront operational visibility."
      />

      <LowBandwidthNotice />

      <SurfaceTabs
        tabs={[
          { href: "/storefront-orders", label: "Storefront Orders" },
          { href: "/orders", label: "Orders" },
          { href: "/payments", label: "Payments" },
          { href: "/commerce-reconciliation", label: "Reconciliation" },
        ]}
      />

      <StorefrontOrderCards summary={summary} />

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
