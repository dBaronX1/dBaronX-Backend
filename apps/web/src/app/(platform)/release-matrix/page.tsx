import { LaunchProgressBar } from "@/components/platform/LaunchProgressBar";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { calculateReleaseReadinessScore } from "@/lib/release/release-readiness-score";
import { getDeploymentReadiness } from "@/lib/deployment/deployment-readiness-api";
import { getFrontendPhaseClosureState } from "@/lib/frontend/frontend-handoff-api";
import { getFinalLaunchClosure } from "@/lib/launch/final-launch-closure-api";
import { getStartupGate } from "@/lib/launch/startup-gate-api";
import { getMedusaFinalClosurePack } from "@/lib/medusa/medusa-final-closure-api";

export const dynamic = "force-dynamic";

export default async function ReleaseMatrixPage() {
  const [frontend, launch, medusa, deployment, startup] = await Promise.all([
    getFrontendPhaseClosureState(),
    getFinalLaunchClosure(),
    getMedusaFinalClosurePack(),
    getDeploymentReadiness(),
    getStartupGate(),
  ]);

  const result = calculateReleaseReadinessScore({
    frontendClosed: frontend.closed,
    launchClosed: launch.finalLaunchClosure.closed,
    medusaClosed: medusa.medusaFinalClosurePack.closed,
    deploymentReady: deployment.deploymentReadiness.ready,
    startupGatePassed: startup.startupGate.passed,
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Release Matrix"
        title="Composite Release Matrix Surface"
        description="Matrix-style release score view across the five remaining top-level closure gates."
      />

      <LowBandwidthNotice />
      <LaunchProgressBar
        label="Composite release matrix"
        complete={result.score}
        total={result.maxScore}
      />
    </main>
  );
}
