import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { MetricStrip } from "@/components/platform/MetricStrip";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";
import { getCommerceAdminDashboard, getLaunchClosure } from "@/lib/platform/platform-api";
import { LaunchStatusBanner } from "@/components/platform/LaunchStatusBanner";

export const dynamic = "force-dynamic";

export default async function EcommerceDashboardPage() {
  const [commerce, launch] = await Promise.all([
    getCommerceAdminDashboard(),
    getLaunchClosure(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="E-commerce Dashboard"
        title="Storefront Commerce Dashboard"
        description="Frontend commerce dashboard for mirrored products, variants, orders, fulfillment state, and settlement monitoring."
      />

      <LowBandwidthNotice />
      <LaunchStatusBanner ready={launch.ready} blockers={launch.blockers} />

      <SurfaceTabs
        tabs={[
          { href: "/ecommerce-dashboard", label: "Dashboard" },
          { href: "/storefront-launch", label: "Launch" },
          { href: "/orders", label: "Orders" },
          { href: "/commerce-reconciliation", label: "Reconciliation" },
        ]}
      />

      <MetricStrip
        items={[
          { label: "Products", value: commerce.productSyncCount },
          { label: "Variants", value: commerce.variantSyncCount },
          { label: "Orders", value: commerce.orderSyncCount },
          { label: "Fulfillments", value: commerce.fulfillmentSyncCount },
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Recent Products" payload={commerce.recentProducts} />
        <JsonPanel title="Recent Orders" payload={commerce.recentOrders} />
      </section>

      <JsonPanel
        title="Settlement Totals"
        payload={commerce.settlementTotals}
      />
    </main>
  );
}
