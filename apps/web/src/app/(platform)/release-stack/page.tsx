import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getDeploymentReadiness } from "@/lib/deployment/deployment-readiness-api";
import { getFinalLaunchClosure } from "@/lib/launch/final-launch-closure-api";
import { getMedusaFinalClosurePack } from "@/lib/medusa/medusa-final-closure-api";
import { getFrontendPhaseClosureState } from "@/lib/frontend/frontend-handoff-api";

export const dynamic = "force-dynamic";

export default async function ReleaseStackPage() {
  const [frontend, launch, medusa, deployment] = await Promise.all([
    getFrontendPhaseClosureState(),
    getFinalLaunchClosure(),
    getMedusaFinalClosurePack(),
    getDeploymentReadiness(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Release Stack"
        title="Release Stack Surface"
        description="Stacked inspection view across frontend closure, launch closure, Medusa closure, and deployment readiness."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Frontend Closure" payload={frontend} />
        <JsonPanel title="Final Launch Closure" payload={launch.finalLaunchClosure} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Medusa Final Closure" payload={medusa.medusaFinalClosurePack} />
        <JsonPanel title="Deployment Readiness" payload={deployment.deploymentReadiness} />
      </section>
    </main>
  );
}
