import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { ReleasePackSections } from "@/components/platform/ReleasePackSections";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getFinalReleasePack } from "@/lib/launch/final-release-pack-api";

export const dynamic = "force-dynamic";

export default async function FinalReleasePackPage() {
  const payload = await getFinalReleasePack();
  const pack = payload.finalReleasePack;

  const deploymentReady = Boolean((pack.deploymentReadiness as Record<string, unknown>).ready);
  const startupPassed = Boolean((pack.startupGate as Record<string, unknown>).passed);
  const finalLaunchClosed = Boolean((pack.finalLaunchClosure as Record<string, unknown>).closed);
  const medusaClosed = Boolean((pack.medusaFinalClosure as Record<string, unknown>).closed);

  const ready = deploymentReady && startupPassed && finalLaunchClosed && medusaClosed;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Final Release Pack"
        title="Final Release Pack Surface"
        description="Aggregate end-stage release surface across launch, Medusa, deployment, startup, runtime, and frontend closure visibility."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Aggregate release state"
        description={
          ready
            ? "Core backend release-pack domains are aligned."
            : "One or more backend release-pack domains remain open."
        }
        tone={ready ? "success" : "warning"}
      />

      <ReleasePackSections pack={pack} />
    </main>
  );
}
