import { FrontendClosureSummary } from "@/components/platform/FrontendClosureSummary";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";
import { getFrontendPhaseClosureState } from "@/lib/frontend/frontend-handoff-api";

export const dynamic = "force-dynamic";

export default async function FrontendReadinessPage() {
  const state = await getFrontendPhaseClosureState();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Frontend Readiness"
        title="Frontend Launch Readiness Surface"
        description="Frontend closure surface summarizing backend contract health and launch-critical operational dependencies."
      />

      <LowBandwidthNotice />

      <SurfaceTabs
        tabs={[
          { href: "/frontend-readiness", label: "Readiness" },
          { href: "/frontend-closure", label: "Closure" },
          { href: "/frontend-contracts", label: "Contracts" },
          { href: "/frontend-handoff", label: "Handoff" },
        ]}
      />

      <FrontendClosureSummary state={state} />
    </main>
  );
}
