import { getAiStoriesAdminDashboard } from "@/lib/platform/platform-api";
import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalMetricCard } from "@/components/platform/OperationalMetricCard";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default async function AiStoriesReviewPage() {
  const dashboard = await getAiStoriesAdminDashboard();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="AI Stories Review"
        title="Campaign Review and Promotion Surface"
        description="Operational AI Stories review surface for campaign monitoring and promotion-state visibility."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 md:grid-cols-2">
        <OperationalMetricCard
          label="Campaigns"
          value={dashboard.totalCampaigns}
        />
        <OperationalMetricCard
          label="Stories"
          value={dashboard.totalStories}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel
          title="Campaign Status Counts"
          payload={dashboard.campaignStatusCounts}
        />
        <JsonPanel
          title="Recent Campaigns"
          payload={dashboard.recentCampaigns}
        />
      </section>
    </main>
  );
}
