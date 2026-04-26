import { FrontendClosureSummary } from "@/components/platform/FrontendClosureSummary";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getFrontendPhaseClosureState } from "@/lib/frontend/frontend-handoff-api";

export const dynamic = "force-dynamic";

export default async function FrontendDomainClosurePage() {
  const state = await getFrontendPhaseClosureState();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Frontend Domain Closure"
        title="Frontend Domain Closure Matrix"
        description="Domain-level closure view for frontend launch-critical dependencies."
      />

      <LowBandwidthNotice />
      <FrontendClosureSummary state={state} />
    </main>
  );
}
