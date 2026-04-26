import { BackendHealthSummary } from "@/components/platform/BackendHealthSummary";
import { JsonPanel } from "@/components/platform/JsonPanel";
import { LaunchStatusBanner } from "@/components/platform/LaunchStatusBanner";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { MetricStrip } from "@/components/platform/MetricStrip";
import { SurfaceHero } from "@/components/platform/SurfaceHero";
import { SurfaceSection } from "@/components/platform/SurfaceSection";
import {
  getCommerceAdminDashboard,
  getFastapiHandoffPack,
  getLaunchClosure,
  getPlatformAdminPack,
} from "@/lib/platform/platform-api";

export const dynamic = "force-dynamic";

export default async function StorefrontLaunchPage() {
  const [launch, fastapi, platform, commerce] = await Promise.all([
    getLaunchClosure(),
    getFastapiHandoffPack(),
    getPlatformAdminPack(),
    getCommerceAdminDashboard(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SurfaceHero
        eyebrow="Storefront Launch"
        title="Commerce Launch Surface"
        description="Frontend launch surface for commerce synchronization, storefront readiness, backend shell health, and settlement visibility."
      />

      <LowBandwidthNotice />
      <LaunchStatusBanner ready={launch.ready} blockers={launch.blockers} />
      <BackendHealthSummary
        launch={launch}
        fastapi={fastapi}
        platform={platform}
      />

      <SurfaceSection
        title="Commerce Metrics"
        description="Current storefront-facing operational mirror from NestJS commerce admin surfaces."
      >
        <MetricStrip
          items={[
            { label: "Products", value: commerce.productSyncCount },
            { label: "Variants", value: commerce.variantSyncCount },
            { label: "Orders", value: commerce.orderSyncCount },
            { label: "Fulfillments", value: commerce.fulfillmentSyncCount },
          ]}
        />
      </SurfaceSection>

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel
          title="Recent Products"
          payload={commerce.recentProducts.slice(0, 12)}
        />
        <JsonPanel
          title="Recent Orders"
          payload={commerce.recentOrders.slice(0, 12)}
        />
      </section>

      <JsonPanel
        title="Settlement Totals"
        payload={commerce.settlementTotals}
        description="Commerce settlement totals exposed to storefront launch monitoring."
      />
    </main>
  );
}
