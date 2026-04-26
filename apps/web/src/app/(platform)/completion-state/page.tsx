import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getCompletionBrief } from "@/lib/finalization/completion-brief-api";
import { getFinalVerificationPack } from "@/lib/finalization/final-verification-pack-api";

export const dynamic = "force-dynamic";

export default async function CompletionStatePage() {
  const [brief, verification] = await Promise.all([
    getCompletionBrief(),
    getFinalVerificationPack(),
  ]);

  const closed =
    brief.completionBrief.aligned && verification.finalVerificationPack.closed;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Completion State"
        title="Completion State Surface"
        description="Minimal final-state surface for whether canonical completion and verification are aligned."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Completion state"
        description={
          closed
            ? "Completion and verification currently align."
            : "Completion and verification do not yet fully align."
        }
        tone={closed ? "success" : "warning"}
      />
    </main>
  );
}
