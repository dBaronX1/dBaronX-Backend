import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { SystemSnapshotCards } from "@/components/platform/SystemSnapshotCards";
import { getAiStoriesAdminDashboard, getCommerceAdminDashboard, getFastapiHandoffPack, getLaunchClosure, getPlatformAdminPack } from "@/lib/platform/platform-api";

export const dynamic = "force-dynamic";

export default async function SystemSnapshotPage() {
  const [launch, fastapi, platform, commerce, aiStories] = await Promise.all([
    getLaunchClosure(),
    getFastapiHandoffPack(),
    getPlatformAdminPack(),
    getCommerceAdminDashboard(),
    getAiStoriesAdminDashboard(),
  ]);

  const payouts = (platform.summary?.payouts ?? {}) as Record<string, unknown>;
  const ads = (platform.summary?.ads ?? {}) as Record<string, unknown>;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="System Snapshot"
        title="Unified System Snapshot Surface"
        description="Compressed backend snapshot across launch closure, FastAPI handoff, commerce, ads, payouts, and AI Stories."
      />

      <LowBandwidthNotice />

      <SystemSnapshotCards
        items={[
          {
            label: "Launch Ready",
            value: launch.ready ? "YES" : "NO",
            helper: "Global launch gate state",
          },
          {
            label: "FastAPI Closed",
            value: fastapi.closed ? "YES" : "NO",
            helper: "Intelligence/risk subsystem closure",
          },
          {
            label: "Payout Requests",
            value: String(payouts.totalPayoutRequests ?? 0),
            helper: "Affiliate payout review load",
          },
          {
            label: "Ad Campaigns",
            value: String(ads.totalCampaigns ?? 0),
            helper: "Current campaign volume",
          },
          {
            label: "Orders",
            value: commerce.orderSyncCount,
            helper: "Mirrored commerce orders",
          },
          {
            label: "Fulfillments",
            value: commerce.fulfillmentSyncCount,
            helper: "Mirrored fulfillment records",
          },
          {
            label: "AI Campaigns",
            value: aiStories.totalCampaigns,
            helper: "AI Stories promotion volume",
          },
          {
            label: "Stories",
            value: aiStories.totalStories,
            helper: "Published/generated story volume",
          },
        ]}
      />
    </main>
  );
}
