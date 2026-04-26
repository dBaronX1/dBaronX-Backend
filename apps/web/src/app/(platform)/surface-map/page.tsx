import { DomainSurfaceCard } from "@/components/platform/DomainSurfaceCard";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getFrontendDomainSummary } from "@/lib/frontend/frontend-domain-summary";

export const dynamic = "force-dynamic";

export default async function SurfaceMapPage() {
  const summary = await getFrontendDomainSummary();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Surface Map"
        title="Frontend Domain Surface Map"
        description="Launch-grade directory across commerce, affiliate, watch-to-earn, ads, AI Stories, suppliers, wallet, payments, and closure surfaces."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Frontend launch map"
        description="Use this surface to navigate directly into domain-specific operational pages without losing launch-context visibility."
        tone={summary.launch.ready ? "success" : "warning"}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DomainSurfaceCard
          title="Commerce"
          description="Catalog, orders, fulfillment, reconciliation, and storefront launch."
          href="/ecommerce-dashboard"
          ready={summary.matrix.commerce.ready}
          metrics={[
            { label: "Products", value: summary.commerce.productSyncCount },
            { label: "Orders", value: summary.commerce.orderSyncCount },
          ]}
        />

        <DomainSurfaceCard
          title="Affiliate"
          description="Payout dashboard, review queue, risk state, and performance."
          href="/affiliate-dashboard"
          ready={summary.matrix.payouts.ready}
          metrics={[
            {
              label: "Requests",
              value: String(summary.payouts.totalPayoutRequests ?? 0),
            },
            {
              label: "Settled",
              value: String(
                (summary.payouts.totals as Record<string, unknown> | undefined)
                  ?.totalSettled ?? 0,
              ),
            },
          ]}
        />

        <DomainSurfaceCard
          title="Watch-to-Earn"
          description="Watch dashboard, session state, reward state, and anti-abuse."
          href="/watch-dashboard"
          ready={summary.fastapi.closed}
          metrics={[
            { label: "FastAPI", value: summary.fastapi.closed ? "Closed" : "Open" },
            {
              label: "Consumers",
              value: summary.fastapi.recommended_consumers.length,
            },
          ]}
        />

        <DomainSurfaceCard
          title="Ads"
          description="Campaign dashboard, review, creative drafting, and interaction."
          href="/ads-dashboard"
          ready={summary.matrix.ads.ready}
          metrics={[
            {
              label: "Campaigns",
              value: String(summary.ads.totalCampaigns ?? 0),
            },
            {
              label: "Spent",
              value: String(
                (summary.ads.totals as Record<string, unknown> | undefined)?.spent ?? 0,
              ),
            },
          ]}
        />

        <DomainSurfaceCard
          title="AI Stories"
          description="Dashboard, creation, promotion, and campaign surfaces."
          href="/ai-stories-dashboard"
          ready={summary.matrix.aiStories.ready}
          metrics={[
            { label: "Campaigns", value: summary.aiStories.totalCampaigns },
            { label: "Stories", value: summary.aiStories.totalStories },
          ]}
        />

        <DomainSurfaceCard
          title="Suppliers"
          description="Supplier lifecycle, settlement visibility, and recent orders."
          href="/supplier-dashboard"
          ready={summary.matrix.suppliers.ready}
          metrics={[
            {
              label: "Orders",
              value: String(summary.suppliers.totalOrders ?? 0),
            },
            {
              label: "Statuses",
              value: Object.keys(
                (summary.suppliers.statusCounts as Record<string, unknown>) ?? {},
              ).length,
            },
          ]}
        />

        <DomainSurfaceCard
          title="Payments"
          description="Checkout operations, payment states, and settlements."
          href="/payments"
          ready={summary.matrix.payments.ready}
          metrics={[
            {
              label: "Settlements",
              value: String(summary.payments.checkoutSettlementCount ?? 0),
            },
            {
              label: "Gross",
              value: String(
                (summary.payments.settlementTotals as Record<string, unknown> | undefined)
                  ?.gross ?? 0,
              ),
            },
          ]}
        />

        <DomainSurfaceCard
          title="Wallet"
          description="Balance visibility, hold state, and ledger overview."
          href="/wallet-ops"
          ready={summary.matrix.wallet.ready}
          metrics={[
            { label: "Wallets", value: String(summary.wallet.walletCount ?? 0) },
            { label: "Holds", value: String(summary.wallet.holdCount ?? 0) },
          ]}
        />

        <DomainSurfaceCard
          title="Launch Closure"
          description="Cross-system readiness, blockers, and launch-phase closure."
          href="/launch-ops"
          ready={summary.launch.ready}
          metrics={[
            { label: "Blockers", value: summary.launch.blockers.length },
            {
              label: "Platform",
              value: summary.platform.shell.ready ? "Ready" : "Blocked",
            },
          ]}
        />
      </section>
    </main>
  );
}
