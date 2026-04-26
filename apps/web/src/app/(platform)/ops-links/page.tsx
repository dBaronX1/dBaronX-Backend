import { QuickLinkGrid } from "@/components/platform/QuickLinkGrid";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SurfaceHero } from "@/components/platform/SurfaceHero";

export const dynamic = "force-dynamic";

export default function OpsLinksPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SurfaceHero
        eyebrow="Ops Links"
        title="Operations Navigation Surface"
        description="Fast navigation layer across operational frontend launch surfaces."
      />

      <LowBandwidthNotice />

      <QuickLinkGrid
        title="Operational Surfaces"
        items={[
          {
            href: "/dashboard",
            title: "Dashboard",
            description: "Unified launch and platform overview",
          },
          {
            href: "/storefront-launch",
            title: "Storefront Launch",
            description: "Commerce launch and storefront mirror visibility",
          },
          {
            href: "/watch-dashboard",
            title: "Watch Dashboard",
            description: "Watch-to-earn reward and intelligence readiness",
          },
          {
            href: "/affiliate-dashboard",
            title: "Affiliate Dashboard",
            description: "Payout and affiliate operational state",
          },
          {
            href: "/ads-dashboard",
            title: "Ads Dashboard",
            description: "Campaign spend and budget monitoring",
          },
          {
            href: "/ai-stories-dashboard",
            title: "AI Stories Dashboard",
            description: "Story and campaign operations",
          },
          {
            href: "/settlements",
            title: "Settlements",
            description: "Checkout and commerce settlement surface",
          },
          {
            href: "/launch-closure-matrix",
            title: "Launch Matrix",
            description: "Readiness and launch-closure distribution",
          },
        ]}
      />
    </main>
  );
}
