import { QuickLinkGrid } from "@/components/platform/QuickLinkGrid";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default function FinalReleaseHubPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Final Release Hub"
        title="Final Release and Closure Directory"
        description="Directory across final release packs, risk views, closure packs, readiness matrices, and go-live verdict surfaces."
      />

      <LowBandwidthNotice />

      <QuickLinkGrid
        title="Release Surfaces"
        items={[
          {
            href: "/final-release-pack",
            title: "Final Release Pack",
            description: "Aggregate backend release pack across launch, Medusa, deployment, startup, and runtime",
          },
          {
            href: "/final-launch-closure",
            title: "Final Launch Closure",
            description: "Aggregated final launch and shell closure",
          },
          {
            href: "/final-ops-closure",
            title: "Final Ops Closure",
            description: "Composite end-to-end ops closure",
          },
          {
            href: "/release-readiness-score",
            title: "Release Score",
            description: "Scored release readiness across remaining top-level domains",
          },
          {
            href: "/release-risks",
            title: "Release Risks",
            description: "Late-stage release risk board",
          },
          {
            href: "/release-verdict",
            title: "Release Verdict",
            description: "Verdict surface for core closure alignment",
          },
          {
            href: "/go-live-decision",
            title: "Go-Live Decision",
            description: "Composite go-live decision across launch, frontend, and Medusa",
          },
          {
            href: "/release-stack",
            title: "Release Stack",
            description: "Stacked inspection across closure and deployment surfaces",
          },
        ]}
      />
    </main>
  );
}
