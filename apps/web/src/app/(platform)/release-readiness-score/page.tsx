import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { ReleaseReadinessScoreCard } from "@/components/platform/ReleaseReadinessScoreCard";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getDeploymentReadiness } from "@/lib/deployment/deployment-readiness-api";
import { getFrontendPhaseClosureState } from "@/lib/frontend/frontend-handoff-api";
import { getFinalLaunchClosure } from "@/lib/launch/final-launch-closure-api";
import { getStartupGate } from "@/lib/launch/startup-gate-api";
import { getMedusaFinalClosurePack } from "@/lib/medusa/medusa-final-closure-api";
import { calculateReleaseReadinessScore } from "@/lib/release/release-readiness-score";

export const dynamic = "force-dynamic";

export default async function ReleaseReadinessScorePage() {
  const [frontend, launch, medusa, deployment, startupGate] = await Promise.all([
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
    startupGatePassed: startupGate.startupGate.passed,
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Release Readiness Score"
        title="Composite Release Score Surface"
        description="Scored release surface across frontend closure, launch closure, Medusa closure, deployment readiness, and startup gate."
      />

      <LowBandwidthNotice />
      <ReleaseReadinessScoreCard result={result} />
    </main>
  );
}
