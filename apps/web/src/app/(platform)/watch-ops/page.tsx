import { getFastapiHandoffPack, getLaunchClosure } from "@/lib/platform/platform-api";
import { LaunchStatusBanner } from "@/components/platform/LaunchStatusBanner";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { JsonPanel } from "@/components/platform/JsonPanel";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default async function WatchOpsPage() {
  const [launch, fastapi] = await Promise.all([
    getLaunchClosure(),
    getFastapiHandoffPack(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Watch-to-Earn Operations"
        title="Watch Session and Reward Control Surface"
        description="Operational watch-to-earn visibility driven by FastAPI intelligence and NestJS launch state."
      />

      <LowBandwidthNotice />
      <LaunchStatusBanner ready={launch.ready} blockers={launch.blockers} />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel
          title="FastAPI Handoff"
          payload={fastapi}
          description="FastAPI handoff status for watch, affiliate, AI Stories, and frontend consumers."
        />
        <JsonPanel
          title="Launch Closure"
          payload={launch}
          description="Current launch blockers affecting watch-to-earn production readiness."
        />
      </section>
    </main>
  );
}
