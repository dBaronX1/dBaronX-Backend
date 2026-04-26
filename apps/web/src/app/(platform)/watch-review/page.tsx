import { getFastapiHandoffPack, getLaunchClosure } from "@/lib/platform/platform-api";
import { JsonPanel } from "@/components/platform/JsonPanel";
import { LaunchStatusBanner } from "@/components/platform/LaunchStatusBanner";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalMetricCard } from "@/components/platform/OperationalMetricCard";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default async function WatchReviewPage() {
  const [launch, fastapi] = await Promise.all([
    getLaunchClosure(),
    getFastapiHandoffPack(),
  ]);

  const recommendedConsumers = fastapi.recommended_consumers ?? [];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Watch Review"
        title="Watch-to-Earn Review and Reward Surface"
        description="Frontend operational review surface for watch-to-earn launch blockers, FastAPI consumer readiness, and reward-intelligence dependence."
      />

      <LowBandwidthNotice />
      <LaunchStatusBanner ready={launch.ready} blockers={launch.blockers} />

      <section className="grid gap-4 md:grid-cols-3">
        <OperationalMetricCard
          label="FastAPI Closed"
          value={fastapi.closed ? "YES" : "NO"}
        />
        <OperationalMetricCard
          label="Enforcement Closed"
          value={fastapi.enforcement.closed ? "YES" : "NO"}
        />
        <OperationalMetricCard
          label="Recommended Consumers"
          value={recommendedConsumers.length}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel
          title="FastAPI Handoff"
          payload={fastapi}
          description="FastAPI handoff state for reward, anti-abuse, and watch review surfaces."
        />
        <JsonPanel
          title="Recommended Consumer Targets"
          payload={recommendedConsumers}
          description="Frontend surfaces expected to consume the FastAPI handoff contract."
        />
      </section>
    </main>
  );
}
