import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { QuickLinkGrid } from "@/components/platform/QuickLinkGrid";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default function SurfaceAuditPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Surface Audit"
        title="Frontend Audit Surface Directory"
        description="Audit-oriented directory across launch hardening, environment, dependencies, orchestration, and Medusa closure inspection."
      />

      <LowBandwidthNotice />

      <QuickLinkGrid
        title="Audit Surfaces"
        items={[
          {
            href: "/launch-audit",
            title: "Launch Audit",
            description: "Startup audit and intelligence trace visibility",
          },
          {
            href: "/startup-audit",
            title: "Startup Audit",
            description: "Startup audit entry inspection surface",
          },
          {
            href: "/deployment-hardening",
            title: "Deployment Hardening",
            description: "Bootstrap and hardening inspection surface",
          },
          {
            href: "/environment-readiness",
            title: "Environment Readiness",
            description: "Readiness snapshots and startup audit summary",
          },
          {
            href: "/service-dependencies",
            title: "Service Dependencies",
            description: "Cross-service dependency inspection",
          },
          {
            href: "/orchestration-index",
            title: "Orchestration Index",
            description: "Operational route and module distribution view",
          },
          {
            href: "/medusa-boundary-proof",
            title: "Medusa Boundary Proof",
            description: "Commerce-only proof and forbidden logic view",
          },
          {
            href: "/medusa-launch-readiness",
            title: "Medusa Launch Readiness",
            description: "Medusa launch-hardening and normalization view",
          },
        ]}
      />
    </main>
  );
}
