import { getPlatformAdminPack } from "@/lib/platform/platform-api";
import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalMetricCard } from "@/components/platform/OperationalMetricCard";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default async function AdsReviewPage() {
  const pack = await getPlatformAdminPack();
  const ads = (pack.summary?.ads ?? {}) as Record<string, unknown>;
  const totals = (ads.totals ?? {}) as Record<string, unknown>;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Ads Review"
        title="Campaign Review and Budget Surface"
        description="Campaign review surface for budget, spend, remaining balance, and recent operational state."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 md:grid-cols-3">
        <OperationalMetricCard
          label="Campaigns"
          value={String(ads.totalCampaigns ?? 0)}
        />
        <OperationalMetricCard
          label="Spent"
          value={String(totals.spent ?? 0)}
        />
        <OperationalMetricCard
          label="Remaining"
          value={String(totals.remaining ?? 0)}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Status Counts" payload={ads.statusCounts ?? {}} />
        <JsonPanel title="Recent Campaigns" payload={ads.recentCampaigns ?? []} />
      </section>
    </main>
  );
}
