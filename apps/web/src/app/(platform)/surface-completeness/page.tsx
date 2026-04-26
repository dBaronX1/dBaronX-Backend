import { LaunchProgressBar } from "@/components/platform/LaunchProgressBar";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionCountGrid } from "@/components/platform/SectionCountGrid";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { calculateSurfaceCompleteness } from "@/lib/frontend/surface-completeness";

export const dynamic = "force-dynamic";

export default function SurfaceCompletenessPage() {
  const completeness = calculateSurfaceCompleteness([
    { title: "E-commerce", complete: 12, total: 18 },
    { title: "Affiliate", complete: 8, total: 12 },
    { title: "Watch / Ads", complete: 9, total: 13 },
    { title: "AI Stories", complete: 8, total: 11 },
    { title: "Launch / Ops", complete: 11, total: 15 },
    { title: "Medusa Closure", complete: 6, total: 10 },
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Surface Completeness"
        title="Frontend Surface Completeness View"
        description="Planning and hardening surface showing current completion across major frontend and closure domains."
      />

      <LowBandwidthNotice />

      <LaunchProgressBar
        label="Surface completeness"
        complete={completeness.totalComplete}
        total={completeness.total}
      />

      <SectionCountGrid
        title="Completeness by Domain"
        counts={completeness.groups.map((group) => ({
          label: group.title,
          value: `${group.complete}/${group.total}`,
        }))}
      />
    </main>
  );
}
