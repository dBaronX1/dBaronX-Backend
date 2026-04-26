import { getFastapiHandoffPack, getPlatformAdminPack } from "@/lib/platform/platform-api";
import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default async function OpsShellPage() {
  const [platformPack, fastapi] = await Promise.all([
    getPlatformAdminPack(),
    getFastapiHandoffPack(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Ops Shell"
        title="Platform and FastAPI Shell Surface"
        description="Shell-level operational surface for backend handoff and platform shell visibility."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Platform Admin Pack" payload={platformPack} />
        <JsonPanel title="FastAPI Handoff Pack" payload={fastapi} />
      </section>
    </main>
  );
}
