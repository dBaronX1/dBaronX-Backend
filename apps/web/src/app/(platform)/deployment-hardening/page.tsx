import { JsonPanel } from "@/components/platform/JsonPanel";
import { KeyValuePanel } from "@/components/platform/KeyValuePanel";
import { LaunchBlockerList } from "@/components/platform/LaunchBlockerList";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getBootstrapReport } from "@/lib/deployment/deployment-api";
import { getLaunchClosure } from "@/lib/platform/platform-api";

export const dynamic = "force-dynamic";

export default async function DeploymentHardeningPage() {
  const [bootstrap, launch] = await Promise.all([
    getBootstrapReport(),
    getLaunchClosure(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Deployment Hardening"
        title="Deployment and Bootstrap Hardening Surface"
        description="Frontend launch-hardening surface for bootstrap state, startup sequencing, and current launch blockers."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 lg:grid-cols-2">
        <KeyValuePanel
          title="Bootstrap State"
          payload={bootstrap.bootstrapReport.bootstrap}
        />
        <KeyValuePanel
          title="Bootstrap Hardening"
          payload={bootstrap.bootstrapReport.bootstrapHardening}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel
          title="Startup Sequence"
          payload={bootstrap.bootstrapReport.startupSequence}
        />
        <LaunchBlockerList blockers={launch.blockers} />
      </section>
    </main>
  );
}
