import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getAiStoriesAdminDashboard } from "@/lib/platform/platform-api";

export const dynamic = "force-dynamic";

export default async function AiStoriesMobilePage() {
  const dashboard = await getAiStoriesAdminDashboard();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-5">
      <SectionHeader
        eyebrow="AI Stories Mobile"
        title="Mobile AI Story Surface"
        description="Compressed mobile-first surface for AI story campaigns and recent story visibility."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Campaign overview"
        description={`Campaigns: ${dashboard.totalCampaigns} • Stories: ${dashboard.totalStories}`}
      />

      <section className="space-y-3">
        {dashboard.recentCampaigns.slice(0, 8).map((campaign, index) => (
          <article
            key={`${String(campaign.id ?? campaign.campaign_id ?? index)}`}
            className="rounded-2xl border bg-white p-4 shadow-sm"
          >
            <p className="text-sm font-semibold">
              {String(campaign.id ?? campaign.campaign_id ?? "n/a")}
            </p>
            <p className="mt-1 text-xs text-neutral-600">
              status: {String(campaign.status ?? "unknown")}
            </p>
            <p className="mt-1 text-xs text-neutral-600">
              title: {String(campaign.title ?? campaign.headline ?? "n/a")}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
