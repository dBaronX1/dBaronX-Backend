import { FrontendClosureSummary } from "@/components/platform/FrontendClosureSummary";
import { LaunchStatusBanner } from "@/components/platform/LaunchStatusBanner";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getFrontendPhaseClosureState } from "@/lib/frontend/frontend-handoff-api";
import { getLaunchClosure } from "@/lib/platform/platform-api";

export const dynamic = "force-dynamic";

export default async function LaunchOpsPage() {
  const [launch, frontendState] = await Promise.all([
    getLaunchClosure(),
    getFrontendPhaseClosureState(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Launch Ops"
        title="End-to-End Launch Operations Surface"
        description="Frontend launch operations surface for global blockers and frontend closure state."
      />

      <LowBandwidthNotice />
      <LaunchStatusBanner ready={launch.ready} blockers={launch.blockers} />
      <FrontendClosureSummary state={frontendState} />
    </main>
  );
}
