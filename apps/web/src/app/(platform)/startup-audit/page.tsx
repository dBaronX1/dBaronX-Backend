import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { TraceSnapshotTable } from "@/components/platform/TraceSnapshotTable";
import { getLaunchAuditTrail } from "@/lib/launch/launch-ops-api";

export const dynamic = "force-dynamic";

export default async function StartupAuditPage() {
  const audit = await getLaunchAuditTrail();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Startup Audit"
        title="Startup Audit Entry Surface"
        description="Frontend inspection surface for startup audit entries and startup-sequence observation."
      />

      <LowBandwidthNotice />

      <TraceSnapshotTable
        title="Startup Audit Entries"
        rows={audit.launchAuditTrail.startupAudit.entries}
        idKey="source"
        secondaryKey="status"
        tertiaryKey="message"
      />
    </main>
  );
}
