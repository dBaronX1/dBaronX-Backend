import { JsonPanel } from "@/components/platform/JsonPanel";
import { LaunchGateCard } from "@/components/platform/LaunchGateCard";
import { LaunchStatusBanner } from "@/components/platform/LaunchStatusBanner";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";
import { getLaunchClosurePayload, getLaunchReadinessPayload } from "@/lib/launch/launch-closure-api";

export const dynamic = "force-dynamic";

export default async function LaunchGatePage() {
  const [closure, readiness] = await Promise.all([
    getLaunchClosurePayload(),
    getLaunchReadinessPayload(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Launch Gate"
        title="Launch Gate and Readiness Surface"
        description="Frontend launch-hardening surface for final blocker visibility and readiness inspection."
      />

      <LowBandwidthNotice />

      <SurfaceTabs
        tabs={[
          { href: "/launch-gate", label: "Launch Gate" },
          { href: "/launch", label: "Launch" },
          { href: "/launch-ops", label: "Launch Ops" },
          { href: "/final-launch-pack", label: "Final Pack" },
        ]}
      />

      <LaunchStatusBanner
        ready={closure.launchClosure.ready}
        blockers={closure.launchClosure.blockers}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <LaunchGateCard
          ready={closure.launchClosure.ready}
          blockers={closure.launchClosure.blockers}
        />
        <JsonPanel
          title="Launch Readiness Payload"
          payload={readiness.launchReadiness}
        />
      </section>
    </main>
  );
}
