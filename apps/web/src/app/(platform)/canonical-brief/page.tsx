import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getCanonicalCompletion } from "@/lib/finalization/canonical-completion-api";
import { getFinalVerificationPack } from "@/lib/finalization/final-verification-pack-api";
import { getFrontendClosureConfirmation } from "@/lib/finalization/frontend-closure-confirmation-api";

export const dynamic = "force-dynamic";

export default async function CanonicalBriefPage() {
  const [canonical, verification, frontend] = await Promise.all([
    getCanonicalCompletion(),
    getFinalVerificationPack(),
    getFrontendClosureConfirmation(),
  ]);

  const aligned =
    canonical.canonicalCompletion.closed &&
    verification.finalVerificationPack.closed &&
    frontend.frontendClosureConfirmation.closed;

  const totalBlockers =
    canonical.canonicalCompletion.blockers.length +
    verification.finalVerificationPack.blockers.length +
    frontend.frontendClosureConfirmation.blockers.length;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Canonical Brief"
        title="Canonical Completion Brief"
        description="Final brief-facing surface for remaining closure alignment across frontend, Medusa, ops, and canonical verification."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Canonical brief"
        description={
          aligned
            ? "Remaining closure surfaces are aligned for canonical completion."
            : `Remaining closure surfaces are not fully aligned. total_blockers=${totalBlockers}`
        }
        tone={aligned ? "success" : "warning"}
      />
    </main>
  );
}
