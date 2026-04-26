import { LaunchStatusBanner } from "@/components/platform/LaunchStatusBanner";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { MetricStrip } from "@/components/platform/MetricStrip";
import { SurfaceHero } from "@/components/platform/SurfaceHero";
import { SurfaceSection } from "@/components/platform/SurfaceSection";
import { getCommerceAdminDashboard, getLaunchClosure } from "@/lib/platform/platform-api";

export const dynamic = "force-dynamic";

export default async function EcommerceReadinessPage() {
  const [commerce, launch] = await Promise.all([
    getCommerceAdminDashboard(),
    getLaunchClosure(),
  ]);

  const settlementTotals = commerce.settlementTotals;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SurfaceHero
        eyebrow="E-commerce Readiness"
        title="Storefront Commerce Readiness Surface"
        description="Frontend readiness surface for storefront commerce mirrors, fulfillment state, and settlement distribution."
      />

      <LowBandwidthNotice />
      <LaunchStatusBanner ready={launch.ready} blockers={launch.blockers} />

      <SurfaceSection
        title="Readiness Metrics"
        description="Commerce launch metrics derived from product, variant, order, fulfillment, and settlement mirrors."
      >
        <MetricStrip
          items={[
            { label: "Products", value: commerce.productSyncCount },
            { label: "Variants", value: commerce.variantSyncCount },
            { label: "Orders", value: commerce.orderSyncCount },
            { label: "Settlements", value: commerce.settlementCount },
          ]}
        />
      </SurfaceSection>

      <SurfaceSection
        title="Settlement Distribution"
        description="Current settlement totals shaping storefront operational readiness."
      >
        <MetricStrip
          items={[
            { label: "Gross", value: settlementTotals.gross },
            { label: "Supplier Cost", value: settlementTotals.supplierCost },
            {
              label: "Affiliate Commission",
              value: settlementTotals.affiliateCommission,
            },
            { label: "Merchant Net", value: settlementTotals.merchantNet },
          ]}
        />
      </SurfaceSection>
    </main>
  );
}
