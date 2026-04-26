import { JsonPanel } from "@/components/platform/JsonPanel";
import { LaunchBlockerList } from "@/components/platform/LaunchBlockerList";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getFrontendClosureConfirmation } from "@/lib/finalization/frontend-closure-confirmation-api";

export const dynamic = "force-dynamic";

export default async function FrontendClosureConfirmationPage() {
  const payload = await getFrontendClosureConfirmation();
  const confirmation = payload.frontendClosureConfirmation;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Frontend Closure Confirmation"
        title="Frontend Final Closure Confirmation Surface"
        description="Final confirmation surface that frontend closure is backed by integrated finalization services rather than standalone placeholder surfaces."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Frontend confirmation state"
        description={
          confirmation.closed
            ? "Frontend closure confirmation currently reports closed."
            : "Frontend closure confirmation still reports unresolved backing checks."
        }
        tone={confirmation.closed ? "success" : "warning"}
      />

      <LaunchBlockerList
        blockers={confirmation.blockers}
        title="Frontend Closure Confirmation Blockers"
      />

      <JsonPanel
        title="Frontend Closure Confirmation"
        payload={confirmation}
      />
    </main>
  );
}
