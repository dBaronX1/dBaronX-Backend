import { GoLiveDecisionCard } from "@/components/platform/GoLiveDecisionCard";
import { LaunchBlockerList } from "@/components/platform/LaunchBlockerList";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getGoLiveCompositeState } from "@/lib/ops/go-live-api";

export const dynamic = "force-dynamic";

export default async function GoLiveDecisionPage() {
  const state = await getGoLiveCompositeState();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Go-Live Decision"
        title="Final Go-Live Decision Surface"
        description="Late integration decision surface combining frontend closure, launch closure, and Medusa closure readiness."
      />

      <LowBandwidthNotice />

      <GoLiveDecisionCard
        frontendClosed={state.frontendClosed}
        launchClosed={state.launchClosed}
        medusaBoundaryReady={state.medusaBoundaryReady}
        medusaReconciliationReady={state.medusaReconciliationReady}
      />

      <LaunchBlockerList blockers={state.blockers} title="Composite Blockers" />
    </main>
  );
}
