import { DependencyMapPanel } from "@/components/platform/DependencyMapPanel";
import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getSystemOperationsHandoff } from "@/lib/launch/launch-ops-api";

export const dynamic = "force-dynamic";

export default async function OperationsHandoffPage() {
  const payload = await getSystemOperationsHandoff();
  const handoff = payload.operationsHandoff;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Operations Handoff"
        title="System Operations Handoff Surface"
        description="Frontend launch surface for cross-system handoff, dependency mapping, and next-subsystem visibility."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Launch Closure" payload={handoff.launchClosure} />
        <JsonPanel title="Module Closure" payload={handoff.moduleClosure} />
      </section>

      <DependencyMapPanel
        title="Service Dependency Map"
        mapping={
          handoff.serviceDependencyMap as Record<
            string,
            { dependsOn?: string[]; role?: string }
          >
        }
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel
          title="Orchestration Index"
          payload={handoff.orchestrationIndex}
        />
        <JsonPanel
          title="Next Subsystems"
          payload={handoff.nextSubsystems}
        />
      </section>
    </main>
  );
}
