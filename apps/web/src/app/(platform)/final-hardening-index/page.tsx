import { QuickLinkGrid } from "@/components/platform/QuickLinkGrid";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default function FinalHardeningIndexPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Final Hardening Index"
        title="Late Integration and Hardening Directory"
        description="Directory across final frontend hardening, Medusa closure proof, release matrices, and end-to-end launch operation surfaces."
      />

      <LowBandwidthNotice />

      <QuickLinkGrid
        title="Hardening Surfaces"
        items={[
          {
            href: "/launch-summary",
            title: "Launch Summary",
            description: "High-level progress and domain readiness",
          },
          {
            href: "/go-live-decision",
            title: "Go-Live Decision",
            description: "Composite release decision across remaining closure domains",
          },
          {
            href: "/release-readiness-matrix",
            title: "Release Matrix",
            description: "Late-stage readiness matrix across critical domains",
          },
          {
            href: "/deployment-hardening",
            title: "Deployment Hardening",
            description: "Bootstrap and blocker inspection",
          },
          {
            href: "/boot-hardening-matrix",
            title: "Boot Hardening Matrix",
            description: "Startup and hardening payload inspection",
          },
          {
            href: "/medusa-final-closure",
            title: "Medusa Final Closure",
            description: "Commerce-only closure surface",
          },
          {
            href: "/medusa-reconciliation-proof",
            title: "Reconciliation Proof",
            description: "NestJS reconciliation authority proof",
          },
          {
            href: "/closure-stack",
            title: "Closure Stack",
            description: "Stacked inspection of remaining closure domains",
          },
        ]}
      />
    </main>
  );
}
