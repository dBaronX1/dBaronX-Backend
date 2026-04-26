import { FrontendClosureSummary } from "@/components/platform/FrontendClosureSummary";
import { LaunchStatusBanner } from "@/components/platform/LaunchStatusBanner";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getFrontendPhaseClosureState } from "@/lib/frontend/frontend-handoff-api";
import { getLaunchClosurePayload } from "@/lib/launch/launch-closure-api";
import { getMedusaBoundaryProof } from "@/lib/medusa/medusa-boundary-api";

export const dynamic = "force-dynamic";

export default async function GoLiveReadinessPage() {
  const [frontendState, launch, medusaBoundary] = await Promise.all([
    getFrontendPhaseClosureState(),
    getLaunchClosurePayload(),
    getMedusaBoundaryProof(),
  ]);

  const medusaReady =
    medusaBoundary.medusaBoundaryProof.forbiddenResponsibilities.length > 0;

  const goLiveReady = frontendState.closed && launch.launchClosure.ready && medusaReady;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Go-Live Readiness"
        title="Go-Live Readiness Surface"
        description="Combined readiness surface across frontend closure, global launch closure, and Medusa commerce-only boundary proof."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Go-live decision state"
        description={
          goLiveReady
            ? "Current core closure signals indicate the system is approaching go-live readiness."
            : "One or more critical closure domains remain open before go-live."
        }
        tone={goLiveReady ? "success" : "warning"}
      />

      <LaunchStatusBanner
        ready={launch.launchClosure.ready}
        blockers={launch.launchClosure.blockers}
      />

      <FrontendClosureSummary state={frontendState} />
    </main>
  );
}
