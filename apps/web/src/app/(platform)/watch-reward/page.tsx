import { LaunchStatusBanner } from "@/components/platform/LaunchStatusBanner";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { MetricStrip } from "@/components/platform/MetricStrip";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";
import { getWatchSurfaceState } from "@/lib/watch/watch-api";

export const dynamic = "force-dynamic";

export default async function WatchRewardPage() {
  const state = await getWatchSurfaceState();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Watch Reward"
        title="Reward Eligibility and Readiness Surface"
        description="Frontend watch reward surface for launch blockers, FastAPI closure, and reward-intelligence dependency visibility."
      />

      <LowBandwidthNotice />
      <LaunchStatusBanner ready={state.launchReady} blockers={state.launchBlockers} />

      <SurfaceTabs
        tabs={[
          { href: "/watch-dashboard", label: "Dashboard" },
          { href: "/watch-session", label: "Session" },
          { href: "/watch-reward", label: "Reward" },
          { href: "/anti-abuse", label: "Anti-Abuse" },
        ]}
      />

      <MetricStrip
        items={[
          { label: "Launch Ready", value: state.launchReady ? "YES" : "NO" },
          { label: "FastAPI Closed", value: state.fastapiClosed ? "YES" : "NO" },
          {
            label: "Enforcement Closed",
            value: state.fastapiEnforcementClosed ? "YES" : "NO",
          },
          {
            label: "Consumers",
            value: state.recommendedConsumers.length,
          },
        ]}
      />
    </main>
  );
}
