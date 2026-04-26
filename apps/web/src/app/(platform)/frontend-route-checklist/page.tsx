import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SurfaceChecklist } from "@/components/platform/SurfaceChecklist";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { FRONTEND_NAVIGATION_AUDIT } from "@/lib/frontend/frontend-navigation-audit";

export const dynamic = "force-dynamic";

export default function FrontendRouteChecklistPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Frontend Route Checklist"
        title="Frontend Route Completion Checklist"
        description="Checklist-oriented frontend hardening surface for verifying critical route presence across launch domains."
      />

      <LowBandwidthNotice />

      <SurfaceChecklist
        title="Critical Route Checklist"
        items={FRONTEND_NAVIGATION_AUDIT.map((item) => ({
          key: item.href,
          label: item.href,
          description: `${item.category}: ${item.purpose}`,
          ready: true,
        }))}
      />
    </main>
  );
}
