import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getFrontendPhaseClosureState } from "@/lib/frontend/frontend-handoff-api";
import { getLaunchClosurePayload } from "@/lib/launch/launch-closure-api";
import { getMedusaBoundaryProof } from "@/lib/medusa/medusa-boundary-api";

export const dynamic = "force-dynamic";

export default async function ClosureStackPage() {
  const [frontend, launch, medusaBoundary] = await Promise.all([
    getFrontendPhaseClosureState(),
    getLaunchClosurePayload(),
    getMedusaBoundaryProof(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Closure Stack"
        title="Frontend, Launch, and Medusa Closure Stack"
        description="Stacked closure inspection across the three remaining late-stage closure domains."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 lg:grid-cols-3">
        <JsonPanel title="Frontend Closure" payload={frontend} />
        <JsonPanel title="Launch Closure" payload={launch.launchClosure} />
        <JsonPanel
          title="Medusa Boundary"
          payload={medusaBoundary.medusaBoundaryProof}
        />
      </section>
    </main>
  );
}
