import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getCanonicalCompletion } from "@/lib/finalization/canonical-completion-api";
import { getFinalizationReadiness } from "@/lib/finalization/finalization-readiness-api";
import { getFinalOpsClosureState } from "@/lib/ops/final-ops-closure-api";

export const dynamic = "force-dynamic";

export default async function OpsConfirmationPage() {
  const [canonical, readiness, finalOps] = await Promise.all([
    getCanonicalCompletion(),
    getFinalizationReadiness(),
    getFinalOpsClosureState(),
  ]);

  const closed =
    canonical.canonicalCompletion.closed &&
    readiness.finalizationReadiness.closed &&
    finalOps.closed;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Ops Confirmation"
        title="Final Ops Closure Confirmation Surface"
        description="Final confirmation surface that end-to-end ops closure is integrated and aligned."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Ops confirmation state"
        description={
          closed
            ? "End-to-end ops closure currently reports confirmed."
            : "End-to-end ops closure still reports unresolved checks."
        }
        tone={closed ? "success" : "warning"}
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <JsonPanel
          title="Canonical Completion"
          payload={canonical.canonicalCompletion}
        />
        <JsonPanel
          title="Finalization Readiness"
          payload={readiness.finalizationReadiness}
        />
        <JsonPanel title="Final Ops Closure" payload={finalOps} />
      </section>
    </main>
  );
}
