import { BackendHealthSummary } from "@/components/platform/BackendHealthSummary";
import { JsonPanel } from "@/components/platform/JsonPanel";
import { LaunchStatusBanner } from "@/components/platform/LaunchStatusBanner";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { MetricStrip } from "@/components/platform/MetricStrip";
import { SurfaceHero } from "@/components/platform/SurfaceHero";
import { SurfaceSection } from "@/components/platform/SurfaceSection";
import {
  getFastapiHandoffPack,
  getLaunchClosure,
  getPlatformAdminPack,
} from "@/lib/platform/platform-api";

export const dynamic = "force-dynamic";

export default async function WatchDashboardPage() {
  const [launch, fastapi, platform] = await Promise.all([
    getLaunchClosure(),
    getFastapiHandoffPack(),
    getPlatformAdminPack(),
  ]);

  const consumers = fastapi.recommended_consumers ?? [];
  const watchConsumerCount = consumers.filter((item) =>
    String(item).toLowerCase().includes("watch"),
  ).length;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SurfaceHero
        eyebrow="Watch-to-Earn Dashboard"
        title="Watch Reward and Risk Launch Surface"
        description="Frontend watch-to-earn dashboard for reward-system readiness, FastAPI handoff visibility, and low-bandwidth launch operation."
      />

      <LowBandwidthNotice />
      <LaunchStatusBanner ready={launch.ready} blockers={launch.blockers} />
      <BackendHealthSummary
        launch={launch}
        fastapi={fastapi}
        platform={platform}
      />

      <SurfaceSection
        title="Watch Metrics"
        description="Derived watch-to-earn readiness metrics from FastAPI handoff signals."
      >
        <MetricStrip
          items={[
            { label: "FastAPI Closed", value: fastapi.closed ? "YES" : "NO" },
            {
              label: "Enforcement Closed",
              value: fastapi.enforcement.closed ? "YES" : "NO",
            },
            { label: "Recommended Consumers", value: consumers.length },
            { label: "Watch Consumers", value: watchConsumerCount },
          ]}
        />
      </SurfaceSection>

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel
          title="FastAPI Handoff Payload"
          payload={fastapi}
        />
        <JsonPanel
          title="Recommended Consumers"
          payload={consumers}
        />
      </section>
    </main>
  );
}
