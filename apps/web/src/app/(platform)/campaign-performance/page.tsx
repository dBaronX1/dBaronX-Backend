import { getAiStoriesAdminDashboard, getPlatformAdminPack } from "@/lib/platform/platform-api";
import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { MetricStrip } from "@/components/platform/MetricStrip";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default async function CampaignPerformancePage() {
  const [pack, aiStories] = await Promise.all([
    getPlatformAdminPack(),
    getAiStoriesAdminDashboard(),
  ]);

  const ads = (pack.summary?.ads ?? {}) as Record<string, unknown>;
  const totals = (ads.totals ?? {}) as Record<string, unknown>;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Campaign Performance"
        title="Ads and AI Stories Performance Surface"
        description="Frontend performance-oriented campaign surface across ad budgets and AI Stories campaign status distribution."
      />

      <LowBandwidthNotice />

      <MetricStrip
        items={[
          { label: "Ad Campaigns", value: String(ads.totalCampaigns ?? 0) },
          { label: "Ad Spent", value: String(totals.spent ?? 0) },
          { label: "Story Campaigns", value: aiStories.totalCampaigns },
          { label: "Stories", value: aiStories.totalStories },
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Ads Status Counts" payload={ads.statusCounts ?? {}} />
        <JsonPanel
          title="AI Story Campaign Status Counts"
          payload={aiStories.campaignStatusCounts}
        />
      </section>
    </main>
  );
}
