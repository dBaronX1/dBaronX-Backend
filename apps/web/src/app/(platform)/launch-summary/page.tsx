import { LaunchProgressBar } from "@/components/platform/LaunchProgressBar";
import { LaunchDomainSummaryCards } from "@/components/platform/LaunchDomainSummaryCards";
import { LaunchStatusBanner } from "@/components/platform/LaunchStatusBanner";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getFrontendPhaseClosureState } from "@/lib/frontend/frontend-handoff-api";
import { getLaunchClosure } from "@/lib/platform/platform-api";

export const dynamic = "force-dynamic";

export default async function LaunchSummaryPage() {
  const [frontend, launch] = await Promise.all([
    getFrontendPhaseClosureState(),
    getLaunchClosure(),
  ]);

  const complete = frontend.checks.filter((item) => item.ready).length;
  const total = frontend.checks.length;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Launch Summary"
        title="Launch Summary Surface"
        description="High-level frontend launch-hardening summary across domain readiness, blockers, and closure progression."
      />

      <LowBandwidthNotice />
      <LaunchStatusBanner ready={launch.ready} blockers={launch.blockers} />
      <LaunchProgressBar complete={complete} total={total} />

      <LaunchDomainSummaryCards
        items={frontend.checks.map((item) => ({
          key: item.key,
          label: item.label,
          ready: item.ready,
          description: item.description,
        }))}
      />
    </main>
  );
}
