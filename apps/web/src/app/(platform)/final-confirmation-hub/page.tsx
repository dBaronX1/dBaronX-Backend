import { QuickLinkGrid } from "@/components/platform/QuickLinkGrid";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default function FinalConfirmationHubPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Final Confirmation Hub"
        title="Final Confirmation and Brief Directory"
        description="Directory for the last confirmation surfaces after the remaining closure packs and verification packs are in place."
      />

      <LowBandwidthNotice />

      <QuickLinkGrid
        title="Confirmation Surfaces"
        items={[
          {
            href: "/frontend-closure-confirmation",
            title: "Frontend Closure Confirmation",
            description: "Backend-backed frontend closure confirmation surface",
          },
          {
            href: "/medusa-confirmation",
            title: "Medusa Confirmation",
            description: "Final confirmation that Medusa closure is aligned",
          },
          {
            href: "/ops-confirmation",
            title: "Ops Confirmation",
            description: "Final confirmation that ops closure is aligned",
          },
          {
            href: "/app-shell-wiring",
            title: "App Shell Wiring",
            description: "Mounted controller and shell wiring inspection",
          },
          {
            href: "/final-verification-pack",
            title: "Final Verification Pack",
            description: "Final proof that remaining surfaces are integrated",
          },
          {
            href: "/finalization-readiness",
            title: "Finalization Readiness",
            description: "Readiness confirmation through canonical shell",
          },
          {
            href: "/done-pass",
            title: "Done Pass",
            description: "Canonical done-pass state surface",
          },
          {
            href: "/completion-brief-final",
            title: "Completion Brief Final",
            description: "Final canonical completion brief",
          },
        ]}
      />
    </main>
  );
}
