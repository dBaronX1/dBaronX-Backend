import { LaunchAuditSummaryCard } from "@/components/platform/LaunchAuditSummaryCard";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { TraceSnapshotTable } from "@/components/platform/TraceSnapshotTable";
import { getLaunchAuditTrail } from "@/lib/launch/launch-ops-api";

export const dynamic = "force-dynamic";

export default async function ReadinessAuditPage() {
  const audit = await getLaunchAuditTrail();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Readiness Audit"
        title="Readiness Audit Surface"
        description="Inspection surface for readiness snapshots and launch audit summary during final launch hardening."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 lg:grid-cols-2">
        <LaunchAuditSummaryCard
          summary={audit.launchAuditTrail.startupAudit.summary as Record<string, unknown>}
        />
        <TraceSnapshotTable
          title="Readiness Snapshots"
          rows={audit.launchAuditTrail.readinessSnapshots}
          idKey="id"
          secondaryKey="created_at"
          tertiaryKey="environment"
        />
      </section>
    </main>
  );
}
