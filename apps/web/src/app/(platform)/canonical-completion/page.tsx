import { JsonPanel } from "@/components/platform/JsonPanel";
import { LaunchBlockerList } from "@/components/platform/LaunchBlockerList";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";
import {
  getCanonicalCompletion,
  getCommerceFinalClosureReadiness,
  getFinalIntegrationVerification,
} from "@/lib/finalization/canonical-completion-api";

export const dynamic = "force-dynamic";

export default async function CanonicalCompletionPage() {
  const [completion, verification, commerce] = await Promise.all([
    getCanonicalCompletion(),
    getFinalIntegrationVerification(),
    getCommerceFinalClosureReadiness(),
  ]);

  const closed = completion.canonicalCompletion.closed;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Canonical Completion"
        title="Canonical Done-Pass Surface"
        description="Final confirmation surface that remaining closure packs are integrated through the canonical app shell."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Canonical completion state"
        description={
          closed
            ? "Canonical completion currently reports closed."
            : "Canonical completion remains in late-stage hardening."
        }
        tone={closed ? "success" : "warning"}
      />

      <LaunchBlockerList
        blockers={completion.canonicalCompletion.blockers}
        title="Canonical Completion Blockers"
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <JsonPanel
          title="Canonical Completion"
          payload={completion.canonicalCompletion}
        />
        <JsonPanel
          title="Final Integration Verification"
          payload={verification.finalIntegrationVerification}
        />
        <JsonPanel
          title="Commerce Final Closure Readiness"
          payload={commerce.commerceFinalClosureReadiness}
        />
      </section>
    </main>
  );
}
