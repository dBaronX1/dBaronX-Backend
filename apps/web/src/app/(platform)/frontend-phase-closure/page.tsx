import { getFastapiHandoffPack, getLaunchClosure, getPlatformAdminPack, getReadinessMatrix } from "@/lib/platform/platform-api";
import { LaunchStatusBanner } from "@/components/platform/LaunchStatusBanner";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { StatusPill } from "@/components/platform/StatusPill";

export const dynamic = "force-dynamic";

export default async function FrontendPhaseClosurePage() {
  const [launch, matrix, pack, fastapi] = await Promise.all([
    getLaunchClosure(),
    getReadinessMatrix(),
    getPlatformAdminPack(),
    getFastapiHandoffPack(),
  ]);

  const checks = [
    { label: "Platform Shell", ready: pack.shell.ready },
    { label: "FastAPI Handoff", ready: fastapi.closed },
    { label: "Launch Closure", ready: launch.ready },
    { label: "Wallet Matrix", ready: matrix.wallet.ready },
    { label: "Commerce Matrix", ready: matrix.commerce.ready },
    { label: "Ads Matrix", ready: matrix.ads.ready },
    { label: "AI Stories Matrix", ready: matrix.aiStories.ready },
    { label: "Payouts Matrix", ready: matrix.payouts.ready },
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Frontend Phase Closure"
        title="Frontend Readiness Closure Surface"
        description="Closure-oriented frontend surface for backend contract health, launch status, and domain readiness."
      />

      <LowBandwidthNotice />
      <LaunchStatusBanner ready={launch.ready} blockers={launch.blockers} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {checks.map((check) => (
          <article key={check.label} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{check.label}</p>
              <StatusPill ready={check.ready} />
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
