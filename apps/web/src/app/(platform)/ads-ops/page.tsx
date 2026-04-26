import { getPlatformAdminPack } from "@/lib/platform/platform-api";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalMetricCard } from "@/components/platform/OperationalMetricCard";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { JsonPanel } from "@/components/platform/JsonPanel";

export const dynamic = "force-dynamic";

export default async function AdsOpsPage() {
  const pack = await getPlatformAdminPack();
  const ads = (pack.summary?.ads ?? {}) as Record<string, unknown>;
  const totals = (ads.totals ?? {}) as Record<string, unknown>;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Ads Operations"
        title="Campaign Budget and Spend Surface"
        description="Admin-facing ad operations for campaign status, spend visibility, and budget monitoring."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OperationalMetricCard
          label="Campaigns"
          value={String(ads.totalCampaigns ?? 0)}
        />
        <OperationalMetricCard
          label="Budget"
          value={String(totals.budget ?? 0)}
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
        <JsonPanel
          title="Campaign Status Counts"
          payload={ads.statusCounts ?? {}}
        />
        <JsonPanel
          title="Recent Campaigns"
          payload={ads.recentCampaigns ?? []}
        />
      </section>
    </main>
  );
}
