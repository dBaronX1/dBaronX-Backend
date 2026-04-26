import { getFastapiHandoffPack, getLaunchClosure, getPlatformAdminPack } from "@/lib/platform/platform-api";
import { JsonPanel } from "@/components/platform/JsonPanel";
import { LaunchStatusBanner } from "@/components/platform/LaunchStatusBanner";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default async function LaunchPage() {
  const [launch, fastapi, pack] = await Promise.all([
    getLaunchClosure(),
    getFastapiHandoffPack(),
    getPlatformAdminPack(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Launch"
        title="Launch Closure and Handoff Surface"
        description="Cross-system launch visibility for NestJS, FastAPI, and platform shell readiness."
      />

      <LowBandwidthNotice />
      <LaunchStatusBanner ready={launch.ready} blockers={launch.blockers} />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Launch Closure" payload={launch} />
        <JsonPanel title="FastAPI Handoff Pack" payload={fastapi} />
      </section>

      <JsonPanel title="Platform Shell" payload={pack.shell} />
    </main>
  );
}
