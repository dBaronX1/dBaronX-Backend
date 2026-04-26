import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";
import {
  getCanonicalCompletion,
  getCommerceFinalClosureReadiness,
  getFinalIntegrationVerification,
} from "@/lib/finalization/canonical-completion-api";
import { getFinalizationReadiness } from "@/lib/finalization/finalization-readiness-api";

export const dynamic = "force-dynamic";

export default async function DonePassPage() {
  const [canonical, integration, commerce, readiness] = await Promise.all([
    getCanonicalCompletion(),
    getFinalIntegrationVerification(),
    getCommerceFinalClosureReadiness(),
    getFinalizationReadiness(),
  ]);

  const ready =
    canonical.canonicalCompletion.closed &&
    integration.finalIntegrationVerification.closed &&
    commerce.commerceFinalClosureReadiness.closed &&
    readiness.finalizationReadiness.closed;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Done Pass"
        title="Canonical Done-Pass Surface"
        description="Final done-pass surface confirming remaining closure packs are integrated, not merely present."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Done-pass state"
        description={
          ready
            ? "Canonical done-pass currently reports aligned."
            : "Canonical done-pass still reports unresolved remaining integration work."
        }
        tone={ready ? "success" : "warning"}
      />
    </main>
  );
}
