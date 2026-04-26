import { JsonPanel } from "@/components/platform/JsonPanel";
import { KeyValuePanel } from "@/components/platform/KeyValuePanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getLaunchAuditTrail } from "@/lib/launch/launch-ops-api";

export const dynamic = "force-dynamic";

export default async function EnvironmentReadinessPage() {
  const audit = await getLaunchAuditTrail();
  const summary = audit.launchAuditTrail.startupAudit.summary as Record<string, unknown>;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Environment Readiness"
        title="Environment and Audit Readiness Surface"
        description="Frontend environment-readiness surface for startup audit summary and recent readiness snapshots."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 lg:grid-cols-2">
        <KeyValuePanel title="Startup Audit Summary" payload={summary} />
        <JsonPanel
          title="Readiness Snapshots"
          payload={audit.launchAuditTrail.readinessSnapshots}
        />
      </section>
    </main>
  );
}
