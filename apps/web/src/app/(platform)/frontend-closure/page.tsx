import { LaunchStatusBanner } from "@/components/platform/LaunchStatusBanner";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { StatusPill } from "@/components/platform/StatusPill";
import { getFastapiHandoffPack, getLaunchClosure, getPlatformAdminPack, getReadinessMatrix } from "@/lib/platform/platform-api";

export const dynamic = "force-dynamic";

export default async function FrontendClosurePage() {
  const [launch, fastapi, platform, matrix] = await Promise.all([
    getLaunchClosure(),
    getFastapiHandoffPack(),
    getPlatformAdminPack(),
    getReadinessMatrix(),
  ]);

  const checks = [
    { label: "Launch Closure", ready: launch.ready },
    { label: "FastAPI Handoff", ready: fastapi.closed },
    { label: "Platform Shell", ready: platform.shell.ready },
    { label: "Wallet", ready: matrix.wallet.ready },
    { label: "Payouts", ready: matrix.payouts.ready },
    { label: "Payments", ready: matrix.payments.ready },
    { label: "Commerce", ready: matrix.commerce.ready },
    { label: "AI Stories", ready: matrix.aiStories.ready },
    { label: "Ads", ready: matrix.ads.ready },
  ];

  const closed = checks.every((item) => item.ready);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Frontend Closure"
        title="Frontend Launch-Phase Closure Surface"
        description="Closure-oriented frontend surface summarizing backend contract health and launch-critical frontend dependencies."
      />

      <LowBandwidthNotice />
      <LaunchStatusBanner ready={launch.ready} blockers={launch.blockers} />

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Frontend Phase Closure</h2>
          <StatusPill ready={closed} readyLabel="Closed" blockedLabel="Open" />
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {checks.map((check) => (
            <article key={check.label} className="rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{check.label}</p>
                <StatusPill ready={check.ready} />
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
