import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getCanonicalCompletion } from "@/lib/finalization/canonical-completion-api";
import { getFinalVerificationPack } from "@/lib/finalization/final-verification-pack-api";
import { getFrontendClosureConfirmation } from "@/lib/finalization/frontend-closure-confirmation-api";

export const dynamic = "force-dynamic";

export default async function CompletionVerdictPage() {
  const [canonical, verification, frontend] = await Promise.all([
    getCanonicalCompletion(),
    getFinalVerificationPack(),
    getFrontendClosureConfirmation(),
  ]);

  const closed =
    canonical.canonicalCompletion.closed &&
    verification.finalVerificationPack.closed &&
    frontend.frontendClosureConfirmation.closed;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Completion Verdict"
        title="Completion Verdict Surface"
        description="Final verdict surface combining canonical completion, final verification, and frontend closure confirmation."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Completion verdict"
        description={
          closed
            ? "The remaining closure surfaces currently align."
            : "The remaining closure surfaces are not yet fully aligned."
        }
        tone={closed ? "success" : "warning"}
      />
    </main>
  );
}
