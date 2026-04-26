import { LaunchBlockerList } from "@/components/platform/LaunchBlockerList";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { SurfaceChecklist } from "@/components/platform/SurfaceChecklist";
import { getDeploymentReadiness } from "@/lib/deployment/deployment-readiness-api";

export const dynamic = "force-dynamic";

export default async function DeploymentReadinessPage() {
  const payload = await getDeploymentReadiness();
  const readiness = payload.deploymentReadiness;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Deployment Readiness"
        title="Deployment Readiness Surface"
        description="Late-stage deployment readiness surface for final environment and connectivity checks."
      />

      <LowBandwidthNotice />

      <SurfaceChecklist
        title="Deployment Checks"
        items={Object.entries(readiness.checks).map(([key, value]) => ({
          key,
          label: key,
          description: "Deployment readiness validation check",
          ready: value,
        }))}
      />

      <LaunchBlockerList
        blockers={readiness.blockers}
        title="Deployment Blockers"
      />
    </main>
  );
}
