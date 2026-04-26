import { getPlatformAdminPack } from "@/lib/platform/platform-api";
import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalMetricCard } from "@/components/platform/OperationalMetricCard";
import { QuickLinkGrid } from "@/components/platform/QuickLinkGrid";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default async function CampaignsPage() {
  const pack = await getPlatformAdminPack();
  const ads = (pack.summary?.ads ?? {}) as Record<string, unknown>;
  const aiStories = (pack.summary?.aiStories ?? {}) as Record<string, unknown>;
  const totals = (ads.totals ?? {}) as Record<string, unknown>;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Campaigns"
        title="Ad and AI Story Campaign Surface"
        description="Unified frontend campaign surface for ad budgets, AI story promotion state, and operational review navigation."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <OperationalMetricCard
          label="Ad Campaigns"
          value={String(ads.totalCampaigns ?? 0)}
        />
        <OperationalMetricCard
          label="Ad Budget"
          value={String(totals.budget ?? 0)}
        />
        <OperationalMetricCard
          label="Ad Spent"
          value={String(totals.spent ?? 0)}
        />
        <OperationalMetricCard
          label="Story Campaigns"
          value={String(aiStories.totalCampaigns ?? 0)}
        />
        <OperationalMetricCard
          label="Stories"
          value={String(aiStories.totalStories ?? 0)}
        />
      </section>

      <QuickLinkGrid
        title="Campaign Surfaces"
        items={[
          {
            href: "/ads-ops",
            title: "Ads Operations",
            description: "Campaign spend and budget operations",
          },
          {
            href: "/ads-review",
            title: "Ads Review",
            description: "Campaign review and status visibility",
          },
          {
            href: "/ai-stories-ops",
            title: "AI Stories Ops",
            description: "Story and campaign operations surface",
          },
          {
            href: "/ai-stories-review",
            title: "AI Stories Review",
            description: "Promotion review and campaign status",
          },
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Ad Status Counts" payload={ads.statusCounts ?? {}} />
        <JsonPanel
          title="AI Story Campaign Status Counts"
          payload={aiStories.campaignStatusCounts ?? {}}
        />
      </section>
    </main>
  );
}
