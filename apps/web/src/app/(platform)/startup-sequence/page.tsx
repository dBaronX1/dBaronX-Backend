import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getBootstrapReport } from "@/lib/deployment/deployment-api";

export const dynamic = "force-dynamic";

export default async function StartupSequencePage() {
  const bootstrap = await getBootstrapReport();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Startup Sequence"
        title="Startup Sequence Inspection Surface"
        description="Frontend inspection surface for startup sequence visibility and bootstrap hardening outputs."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel
          title="Startup Sequence"
          payload={bootstrap.bootstrapReport.startupSequence}
        />
        <JsonPanel
          title="Bootstrap Report"
          payload={bootstrap.bootstrapReport.bootstrap}
        />
      </section>
    </main>
  );
}
