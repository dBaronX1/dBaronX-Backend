import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getSystemOperationsHandoff } from "@/lib/launch/launch-ops-api";

export const dynamic = "force-dynamic";

export default async function OrchestrationIndexPage() {
  const handoff = await getSystemOperationsHandoff();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Orchestration Index"
        title="Operational Route and Module Index Surface"
        description="Frontend inspection surface for backend orchestration routes and module distribution."
      />

      <LowBandwidthNotice />

      <JsonPanel
        title="Orchestration Index"
        payload={handoff.operationsHandoff.orchestrationIndex}
      />
    </main>
  );
}
