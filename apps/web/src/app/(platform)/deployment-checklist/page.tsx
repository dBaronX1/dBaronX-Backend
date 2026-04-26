import { DeploymentChecklist } from "@/components/platform/DeploymentChecklist";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getBootstrapReport } from "@/lib/deployment/deployment-api";
import { getLaunchClosure, getPlatformAdminPack } from "@/lib/platform/platform-api";

export const dynamic = "force-dynamic";

export default async function DeploymentChecklistPage() {
  const [bootstrap, launch, platform] = await Promise.all([
    getBootstrapReport(),
    getLaunchClosure(),
    getPlatformAdminPack(),
  ]);

  const items = [
    {
      key: "bootstrap",
      label: "Bootstrap report present",
      helper: "Bootstrap report must be available for deployment inspection.",
      ready: Boolean(bootstrap.bootstrapReport.bootstrap),
    },
    {
      key: "startup-sequence",
      label: "Startup sequence present",
      helper: "Startup sequencing payload should be visible for launch hardening.",
      ready: Boolean(bootstrap.bootstrapReport.startupSequence),
    },
    {
      key: "platform-shell",
      label: "Platform shell ready",
      helper: "Platform shell should be ready before final launch.",
      ready: platform.shell.ready,
    },
    {
      key: "launch-closure",
      label: "Launch closure ready",
      helper: "Global launch closure should report ready before go-live.",
      ready: launch.ready,
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Deployment Checklist"
        title="Deployment Checklist Surface"
        description="Frontend deployment-hardening checklist for bootstrap visibility, startup sequencing, platform shell readiness, and launch closure."
      />

      <LowBandwidthNotice />
      <DeploymentChecklist items={items} />
    </main>
  );
}
