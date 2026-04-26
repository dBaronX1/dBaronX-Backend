import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { MetricStrip } from "@/components/platform/MetricStrip";
import { SurfaceHero } from "@/components/platform/SurfaceHero";
import { SurfaceSection } from "@/components/platform/SurfaceSection";
import { getAiStoriesAdminDashboard } from "@/lib/platform/platform-api";

export const dynamic = "force-dynamic";

export default async function AiStoriesDashboardPage() {
  const dashboard = await getAiStoriesAdminDashboard();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SurfaceHero
        eyebrow="AI Stories Dashboard"
        title="Story Campaign and Promotion Dashboard"
        description="Frontend AI Stories dashboard for campaign volumes, content operations, and promotion-state visibility."
      />

      <LowBandwidthNotice />

      <SurfaceSection
        title="AI Story Metrics"
        description="Aggregated campaign and story metrics from the AI Stories admin backend."
      >
        <MetricStrip
          items={[
            { label: "Campaigns", value: dashboard.totalCampaigns },
            { label: "Stories", value: dashboard.totalStories },
            {
              label: "Recent Campaigns",
              value: dashboard.recentCampaigns.length,
            },
            {
              label: "Recent Stories",
              value: dashboard.recentStories.length,
            },
          ]}
        />
      </SurfaceSection>

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel
          title="Campaign Status Counts"
          payload={dashboard.campaignStatusCounts}
        />
        <JsonPanel
          title="Recent Stories"
          payload={dashboard.recentStories}
        />
      </section>
    </main>
  );
}
