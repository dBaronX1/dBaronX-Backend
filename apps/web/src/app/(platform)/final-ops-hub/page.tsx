import { QuickLinkGrid } from "@/components/platform/QuickLinkGrid";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default function FinalOpsHubPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Final Ops Hub"
        title="Final Launch Hardening Directory"
        description="Late integration directory across final frontend hardening, Medusa closure, and end-to-end launch operations."
      />

      <LowBandwidthNotice />

      <QuickLinkGrid
        title="Final Hardening Surfaces"
        items={[
          {
            href: "/frontend-final-closure",
            title: "Frontend Final Closure",
            description: "Frontend closure summary and final launch blockers",
          },
          {
            href: "/deployment-hardening",
            title: "Deployment Hardening",
            description: "Bootstrap, startup sequence, and blocker surface",
          },
          {
            href: "/deployment-checklist",
            title: "Deployment Checklist",
            description: "Final deployment readiness checklist",
          },
          {
            href: "/launch-gate",
            title: "Launch Gate",
            description: "Launch gate and readiness visibility",
          },
          {
            href: "/launch-audit",
            title: "Launch Audit",
            description: "Startup audit and intelligence trace surface",
          },
          {
            href: "/service-dependencies",
            title: "Service Dependencies",
            description: "Cross-service dependency inspection",
          },
          {
            href: "/medusa-final-closure",
            title: "Medusa Final Closure",
            description: "Commerce-only closure and boundary proof",
          },
          {
            href: "/final-launch-pack",
            title: "Final Launch Pack",
            description: "Aggregated final launch-hardening payload",
          },
        ]}
      />
    </main>
  );
}
