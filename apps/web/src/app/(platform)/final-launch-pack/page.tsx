import { getFrontendPhaseClosureState } from "@/lib/frontend/frontend-handoff-api";
import { getLaunchAuditTrail, getSystemOperationsHandoff } from "@/lib/launch/launch-ops-api";
import { getMedusaClosureSnapshot } from "@/lib/medusa/medusa-closure-api";
import { getFastapiHandoffPack, getLaunchClosure, getPlatformAdminPack } from "@/lib/platform/platform-api";
import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default async function FinalLaunchPackPage() {
  const [launch, platform, fastapi, frontendState, audit, handoff, medusa] =
    await Promise.all([
      getLaunchClosure(),
      getPlatformAdminPack(),
      getFastapiHandoffPack(),
      getFrontendPhaseClosureState(),
      getLaunchAuditTrail(),
      getSystemOperationsHandoff(),
      getMedusaClosureSnapshot(),
    ]);

  const pack = {
    launch,
    platformShell: platform.shell,
    fastapi,
    frontendState,
    startupAuditSummary: audit.launchAuditTrail.startupAudit.summary,
    nextSubsystems: handoff.operationsHandoff.nextSubsystems,
    medusaSyncContract: medusa.medusaSyncContract,
    medusaNormalization: medusa.medusaFulfillmentNormalizationPolicy,
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Final Launch Pack"
        title="Aggregated Launch Hardening Surface"
        description="Frontend aggregate launch pack across launch closure, platform shell, FastAPI handoff, frontend closure, startup audit, operations handoff, and Medusa closure."
      />

      <LowBandwidthNotice />

      <JsonPanel title="Final Launch Pack" payload={pack} />
    </main>
  );
}
