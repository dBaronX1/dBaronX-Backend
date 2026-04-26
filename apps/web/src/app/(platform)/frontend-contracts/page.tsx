import { getFastapiHandoffPack, getLaunchClosure, getPlatformAdminPack, getReadinessMatrix } from "@/lib/platform/platform-api";
import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default async function FrontendContractsPage() {
  const [launch, matrix, platform, fastapi] = await Promise.all([
    getLaunchClosure(),
    getReadinessMatrix(),
    getPlatformAdminPack(),
    getFastapiHandoffPack(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Frontend Contracts"
        title="Backend Contract Inspection Surface"
        description="Inspection surface for frontend-facing backend contracts across launch closure, readiness matrix, platform shell, and FastAPI handoff."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Launch Closure Contract" payload={launch} />
        <JsonPanel title="Readiness Matrix Contract" payload={matrix} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Platform Admin Pack Contract" payload={platform} />
        <JsonPanel title="FastAPI Handoff Contract" payload={fastapi} />
      </section>
    </main>
  );
}
