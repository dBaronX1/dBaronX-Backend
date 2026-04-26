import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { TraceSnapshotTable } from "@/components/platform/TraceSnapshotTable";
import { getLaunchAuditTrail } from "@/lib/launch/launch-ops-api";

export const dynamic = "force-dynamic";

export default async function LaunchAuditPage() {
  const payload = await getLaunchAuditTrail();
  const audit = payload.launchAuditTrail;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Launch Audit"
        title="Launch Audit and Trace Surface"
        description="Frontend launch-operations surface for startup audit logs, intelligence traces, and readiness snapshots."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel
          title="Startup Audit Summary"
          payload={audit.startupAudit.summary}
        />
        <JsonPanel
          title="Startup Audit Entries"
          payload={audit.startupAudit.entries}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <TraceSnapshotTable
          title="Intelligence Audit Traces"
          rows={audit.intelligenceAuditTraces}
          idKey="id"
          secondaryKey="created_at"
          tertiaryKey="flow_type"
        />
        <TraceSnapshotTable
          title="Readiness Snapshots"
          rows={audit.readinessSnapshots}
          idKey="id"
          secondaryKey="created_at"
          tertiaryKey="environment"
        />
      </section>
    </main>
  );
}
