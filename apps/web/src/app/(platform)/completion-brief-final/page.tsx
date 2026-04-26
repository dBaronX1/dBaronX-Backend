import { CompletionBriefCard } from "@/components/platform/CompletionBriefCard";
import { LaunchBlockerList } from "@/components/platform/LaunchBlockerList";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getCompletionBrief } from "@/lib/finalization/completion-brief-api";

export const dynamic = "force-dynamic";

export default async function CompletionBriefFinalPage() {
  const payload = await getCompletionBrief();
  const brief = payload.completionBrief;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Completion Brief Final"
        title="Final Canonical Completion Brief"
        description="Final backend-driven completion brief for remaining closure alignment."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Final brief state"
        description={
          brief.aligned
            ? "Canonical completion brief currently reports aligned."
            : "Canonical completion brief still reports unresolved closure alignment."
        }
        tone={brief.aligned ? "success" : "warning"}
      />

      <CompletionBriefCard
        aligned={brief.aligned}
        blockerCount={brief.blockerCount}
        completionBand={brief.completionBand}
        nextAction={brief.nextAction}
      />

      <LaunchBlockerList
        blockers={brief.blockers}
        title="Completion Brief Blockers"
      />
    </main>
  );
}
