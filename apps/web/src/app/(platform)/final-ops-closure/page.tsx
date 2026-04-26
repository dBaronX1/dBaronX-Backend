import { FinalOpsClosureCard } from "@/components/platform/FinalOpsClosureCard";
import { JsonPanel } from "@/components/platform/JsonPanel";
import { LaunchBlockerList } from "@/components/platform/LaunchBlockerList";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getFinalOpsClosureState } from "@/lib/ops/final-ops-closure-api";

export const dynamic = "force-dynamic";

export default async function FinalOpsClosurePage() {
  const state = await getFinalOpsClosureState();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Final Ops Closure"
        title="Final Operations Closure Surface"
        description="End-to-end closure surface for remaining launch-hardening work."
      />

      <LowBandwidthNotice />

      <FinalOpsClosureCard
        closed={state.closed}
        blockerCount={state.blockers.length}
      />

      <LaunchBlockerList blockers={state.blockers} title="Final Ops Blockers" />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Final Launch Closure" payload={state.launch} />
        <JsonPanel title="Medusa Final Closure" payload={state.medusa} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Frontend Closure" payload={state.frontend} />
        <JsonPanel title="Startup Gate" payload={state.startupGate} />
      </section>
    </main>
  );
}
