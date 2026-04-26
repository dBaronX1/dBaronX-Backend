import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getLaunchAuditTrail, getSystemOperationsHandoff } from "@/lib/launch/launch-ops-api";

export const dynamic = "force-dynamic";

export default async function LaunchEnvironmentPage() {
  const [audit, handoff] = await Promise.all([
    getLaunchAuditTrail(),
    getSystemOperationsHandoff(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Launch Environment"
        title="Environment and Startup Visibility Surface"
        description="Frontend launch environment surface for startup audit, readiness snapshots, and service dependency visibility."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel
          title="Startup Audit Summary"
          payload={audit.launchAuditTrail.startupAudit.summary}
        />
        <JsonPanel
          title="Service Dependency Map"
          payload={handoff.operationsHandoff.serviceDependencyMap}
        />
      </section>

      <JsonPanel
        title="Readiness Snapshots"
        payload={audit.launchAuditTrail.readinessSnapshots}
      />
    </main>
  );
}
