import { getCommerceAdminDashboard, getLaunchClosure } from "@/lib/platform/platform-api";
import { JsonPanel } from "@/components/platform/JsonPanel";
import { LaunchStatusBanner } from "@/components/platform/LaunchStatusBanner";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalMetricCard } from "@/components/platform/OperationalMetricCard";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default async function StorefrontOpsPage() {
  const [commerce, launch] = await Promise.all([
    getCommerceAdminDashboard(),
    getLaunchClosure(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Storefront Operations"
        title="Storefront Commerce and Launch Surface"
        description="Frontend launch-grade storefront operations surface for commerce mirrors, fulfillments, and launch blockers."
      />

      <LowBandwidthNotice />
      <LaunchStatusBanner ready={launch.ready} blockers={launch.blockers} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OperationalMetricCard label="Products" value={commerce.productSyncCount} />
        <OperationalMetricCard label="Variants" value={commerce.variantSyncCount} />
        <OperationalMetricCard label="Orders" value={commerce.orderSyncCount} />
        <OperationalMetricCard label="Fulfillments" value={commerce.fulfillmentSyncCount} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel
          title="Recent Products"
          payload={commerce.recentProducts}
        />
        <JsonPanel
          title="Recent Orders"
          payload={commerce.recentOrders}
        />
      </section>
    </main>
  );
}
