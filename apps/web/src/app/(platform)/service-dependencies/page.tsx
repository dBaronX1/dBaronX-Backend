import { DependencyMapPanel } from "@/components/platform/DependencyMapPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getSystemOperationsHandoff } from "@/lib/launch/launch-ops-api";

export const dynamic = "force-dynamic";

export default async function ServiceDependenciesPage() {
  const handoff = await getSystemOperationsHandoff();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Service Dependencies"
        title="Cross-Service Dependency Surface"
        description="Frontend launch-hardening surface for system dependency inspection and deployment sequencing."
      />

      <LowBandwidthNotice />

      <DependencyMapPanel
        title="Dependency Map"
        mapping={
          handoff.operationsHandoff.serviceDependencyMap as Record<
            string,
            { dependsOn?: string[]; role?: string }
          >
        }
      />
    </main>
  );
}
