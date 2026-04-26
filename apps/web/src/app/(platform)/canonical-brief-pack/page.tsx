import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getCanonicalCompletion } from "@/lib/finalization/canonical-completion-api";
import { getFinalVerificationPack } from "@/lib/finalization/final-verification-pack-api";
import { getFinalizationReadiness } from "@/lib/finalization/finalization-readiness-api";
import { getFrontendClosureConfirmation } from "@/lib/finalization/frontend-closure-confirmation-api";

export const dynamic = "force-dynamic";

export default async function CanonicalBriefPackPage() {
  const [canonical, verification, readiness, frontend] = await Promise.all([
    getCanonicalCompletion(),
    getFinalVerificationPack(),
    getFinalizationReadiness(),
    getFrontendClosureConfirmation(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Canonical Brief Pack"
        title="Canonical Completion Brief Pack Surface"
        description="Brief-support surface aggregating the final completion, verification, readiness, and frontend closure confirmation payloads."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Canonical Completion" payload={canonical.canonicalCompletion} />
        <JsonPanel title="Final Verification Pack" payload={verification.finalVerificationPack} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Finalization Readiness" payload={readiness.finalizationReadiness} />
        <JsonPanel title="Frontend Closure Confirmation" payload={frontend.frontendClosureConfirmation} />
      </section>
    </main>
  );
}
