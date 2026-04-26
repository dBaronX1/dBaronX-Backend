import { getLaunchClosure, getPlatformAdminPack, getReadinessMatrix } from "@/lib/platform/platform-api";
import { LaunchStatusBanner } from "@/components/platform/LaunchStatusBanner";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalMetricCard } from "@/components/platform/OperationalMetricCard";
import { ReadinessGrid } from "@/components/platform/ReadinessGrid";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [launch, matrix, pack] = await Promise.all([
    getLaunchClosure(),
    getReadinessMatrix(),
    getPlatformAdminPack(),
  ]);

  const shell = pack.shell;
  const summary = pack.summary ?? {};
  const payouts = (summary.payouts ?? {}) as Record<string, unknown>;
  const commerce = (summary.commerce ?? {}) as Record<string, unknown>;
  const ads = (summary.ads ?? {}) as Record<string, unknown>;
  const aiStories = (summary.aiStories ?? {}) as Record<string, unknown>;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="dBaronX Platform"
        title="Unified Operations Dashboard"
        description="Launch-focused command surface across readiness, revenue systems, and operational mirrors."
      />

      <LowBandwidthNotice />
      <LaunchStatusBanner ready={launch.ready} blockers={launch.blockers} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <OperationalMetricCard label="Platform Ready" value={shell.ready ? "YES" : "NO"} />
        <OperationalMetricCard label="Launch Blockers" value={launch.blockers.length} />
        <OperationalMetricCard
          label="Payout Requests"
          value={String(payouts.totalPayoutRequests ?? 0)}
        />
        <OperationalMetricCard
          label="Commerce Settlements"
          value={String(commerce.settlementCount ?? 0)}
        />
        <OperationalMetricCard
          label="Ad Campaigns"
          value={String(ads.totalCampaigns ?? 0)}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <OperationalMetricCard
          label="AI Story Campaigns"
          value={String(aiStories.totalCampaigns ?? 0)}
        />
        <OperationalMetricCard
          label="AI Stories"
          value={String(aiStories.totalStories ?? 0)}
        />
      </section>

      <ReadinessGrid matrix={matrix} />
    </main>
  );
}
