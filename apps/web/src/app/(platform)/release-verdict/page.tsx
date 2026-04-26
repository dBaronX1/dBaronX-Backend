import { GoLiveDecisionCard } from "@/components/platform/GoLiveDecisionCard";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getGoLiveCompositeState } from "@/lib/ops/go-live-api";

export const dynamic = "force-dynamic";

export default async function ReleaseVerdictPage() {
  const state = await getGoLiveCompositeState();

  const ready =
    state.frontendClosed &&
    state.launchClosed &&
    state.medusaBoundaryReady &&
    state.medusaReconciliationReady;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Release Verdict"
        title="Release Verdict Surface"
        description="Late-stage verdict surface for whether the remaining critical closure domains are aligned."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Release verdict"
        description={
          ready
            ? "Core remaining closure domains are aligned."
            : "Critical remaining closure domains are not yet fully aligned."
        }
        tone={ready ? "success" : "warning"}
      />

      <GoLiveDecisionCard
        frontendClosed={state.frontendClosed}
        launchClosed={state.launchClosed}
        medusaBoundaryReady={state.medusaBoundaryReady}
        medusaReconciliationReady={state.medusaReconciliationReady}
      />
    </main>
  );
}
