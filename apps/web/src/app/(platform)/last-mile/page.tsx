import { QuickLinkGrid } from "@/components/platform/QuickLinkGrid";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default function LastMilePage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Last Mile"
        title="Last-Mile Hardening Directory"
        description="Final last-mile routes for cleanup, confirmation, verification, and canonical brief completion."
      />

      <LowBandwidthNotice />

      <QuickLinkGrid
        title="Last-Mile Surfaces"
        items={[
          {
            href: "/final-cleanup",
            title: "Final Cleanup",
            description: "Last-stage cleanup checklist across remaining domains",
          },
          {
            href: "/final-confirmation-hub",
            title: "Final Confirmation Hub",
            description: "Directory for the confirmation and brief surfaces",
          },
          {
            href: "/completion-state",
            title: "Completion State",
            description: "Minimal final-state closure surface",
          },
          {
            href: "/completion-brief-final",
            title: "Completion Brief Final",
            description: "Final canonical completion brief route",
          },
          {
            href: "/canonical-brief",
            title: "Canonical Brief",
            description: "Brief-facing verdict route",
          },
          {
            href: "/canonical-brief-pack",
            title: "Canonical Brief Pack",
            description: "Aggregated brief support payloads",
          },
        ]}
      />
    </main>
  );
}
