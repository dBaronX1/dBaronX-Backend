import { QuickLinkGrid } from "@/components/platform/QuickLinkGrid";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default function FinalClosureDirectoryPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Final Closure Directory"
        title="Final Closure and Completion Directory"
        description="Directory for the last-stage confirmation, verification, and brief-facing closure surfaces."
      />

      <LowBandwidthNotice />

      <QuickLinkGrid
        title="Completion Surfaces"
        items={[
          {
            href: "/frontend-closure-confirmation",
            title: "Frontend Closure Confirmation",
            description: "Confirms frontend closure surfaces are backed by integrated finalization services.",
          },
          {
            href: "/medusa-confirmation",
            title: "Medusa Confirmation",
            description: "Confirms final Medusa closure readiness and final closure pack alignment.",
          },
          {
            href: "/ops-confirmation",
            title: "Ops Confirmation",
            description: "Confirms final ops closure alignment.",
          },
          {
            href: "/final-verification-pack",
            title: "Final Verification Pack",
            description: "Proves remaining closure surfaces are integrated, not just present.",
          },
          {
            href: "/finalization-readiness",
            title: "Finalization Readiness",
            description: "Confirms final closure packs are wired into the canonical NestJS shell.",
          },
          {
            href: "/canonical-completion",
            title: "Canonical Completion",
            description: "Canonical done-pass completion surface.",
          },
          {
            href: "/canonical-completion-brief",
            title: "Canonical Completion Brief",
            description: "Brief-facing completion verdict surface.",
          },
          {
            href: "/canonical-brief-pack",
            title: "Canonical Brief Pack",
            description: "Aggregated completion brief support payloads.",
          },
        ]}
      />
    </main>
  );
}
