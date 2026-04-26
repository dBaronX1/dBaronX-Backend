import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { MetricStrip } from "@/components/platform/MetricStrip";
import { SurfaceHero } from "@/components/platform/SurfaceHero";
import { SurfaceSection } from "@/components/platform/SurfaceSection";
import { getPlatformAdminPack } from "@/lib/platform/platform-api";

export const dynamic = "force-dynamic";

export default async function AdsDashboardPage() {
  const pack = await getPlatformAdminPack();
  const ads = (pack.summary?.ads ?? {}) as Record<string, unknown>;
  const totals = (ads.totals ?? {}) as Record<string, unknown>;
  const recentCampaigns = Array.isArray(ads.recentCampaigns)
    ? ads.recentCampaigns
    : [];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SurfaceHero
        eyebrow="Ads Dashboard"
        title="Campaign Budget and Spend Dashboard"
        description="Frontend launch-grade ad operations dashboard for campaign volume, spend pacing, remaining balance, and operational visibility."
      />

      <LowBandwidthNotice />

      <SurfaceSection
        title="Campaign Metrics"
        description="Budget and spend metrics currently exposed by the NestJS ads admin surface."
      >
        <MetricStrip
          items={[
            { label: "Campaigns", value: String(ads.totalCampaigns ?? 0) },
            { label: "Budget", value: String(totals.budget ?? 0) },
            { label: "Spent", value: String(totals.spent ?? 0) },
            { label: "Remaining", value: String(totals.remaining ?? 0) },
          ]}
        />
      </SurfaceSection>

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel
          title="Campaign Status Counts"
          payload={ads.statusCounts ?? {}}
        />
        <JsonPanel
          title="Recent Campaigns"
          payload={recentCampaigns}
        />
      </section>
    </main>
  );
}
