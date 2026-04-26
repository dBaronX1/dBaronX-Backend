import { getFastapiHandoffPack, getLaunchClosure, getPlatformAdminPack } from "@/lib/platform/platform-api";
import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default async function FrontendLaunchPackPage() {
  const [launch, platform, fastapi] = await Promise.all([
    getLaunchClosure(),
    getPlatformAdminPack(),
    getFastapiHandoffPack(),
  ]);

  const payload = {
    launch,
    platformShell: platform.shell,
    platformSummaryKeys: Object.keys(platform.summary ?? {}),
    fastapi,
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Frontend Launch Pack"
        title="Aggregated Launch Payload Surface"
        description="Frontend aggregated launch pack for platform shell, launch closure, backend summary visibility, and FastAPI handoff."
      />

      <LowBandwidthNotice />

      <JsonPanel
        title="Frontend Launch Pack"
        payload={payload}
      />
    </main>
  );
}
