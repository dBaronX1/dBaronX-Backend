import { FrontendClosureSummary } from "@/components/platform/FrontendClosureSummary";
import { LaunchStatusBanner } from "@/components/platform/LaunchStatusBanner";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getFrontendPhaseClosureState } from "@/lib/frontend/frontend-handoff-api";
import { getLaunchClosure } from "@/lib/platform/platform-api";

export const dynamic = "force-dynamic";

export default async function FrontendFinalClosurePage() {
  const [state, launch] = await Promise.all([
    getFrontendPhaseClosureState(),
    getLaunchClosure(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Frontend Final Closure"
        title="Frontend Final Closure Surface"
        description="Final frontend launch-hardening surface for closure status and remaining launch blockers."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Frontend closure summary"
        description={
          state.closed
            ? "Frontend critical checks are currently closed for this phase."
            : `Frontend still has ${state.blockers.length} unresolved check(s) for this phase.`
        }
        tone={state.closed ? "success" : "warning"}
      />

      <LaunchStatusBanner ready={launch.ready} blockers={launch.blockers} />
      <FrontendClosureSummary state={state} />
    </main>
  );
}
