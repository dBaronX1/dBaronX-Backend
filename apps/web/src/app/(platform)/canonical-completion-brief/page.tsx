import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getCanonicalCompletion } from "@/lib/finalization/canonical-completion-api";
import { getFinalizationReadiness } from "@/lib/finalization/finalization-readiness-api";

export const dynamic = "force-dynamic";

export default async function CanonicalCompletionBriefPage() {
  const [canonical, readiness] = await Promise.all([
    getCanonicalCompletion(),
    getFinalizationReadiness(),
  ]);

  const payload = canonical.canonicalCompletion;
  const finalization = readiness.finalizationReadiness;

  const aligned = payload.closed && finalization.closed;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Canonical Completion Brief"
        title="Canonical Completion Brief Surface"
        description="Brief-facing final surface for closure alignment and remaining completion state."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Completion brief verdict"
        description={
          aligned
            ? `closed • band=${payload.completionBand} • next=${payload.nextAction}`
            : `open • band=${payload.completionBand} • next=${payload.nextAction} • blockers=${payload.blockers.length + finalization.blockers.length}`
        }
        tone={aligned ? "success" : "warning"}
      />
    </main>
  );
}
