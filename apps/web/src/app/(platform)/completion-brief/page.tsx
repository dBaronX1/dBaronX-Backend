import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getCanonicalCompletion } from "@/lib/finalization/canonical-completion-api";

export const dynamic = "force-dynamic";

export default async function CompletionBriefPage() {
  const completion = await getCanonicalCompletion();
  const payload = completion.canonicalCompletion;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Completion Brief"
        title="Canonical Completion Brief Surface"
        description="Briefing surface for whether the system remains in hardening or is ready for final completion reporting."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Completion brief"
        description={`band=${payload.completionBand} • next=${payload.nextAction} • blockers=${payload.blockers.length}`}
        tone={payload.closed ? "success" : "warning"}
      />
    </main>
  );
}
