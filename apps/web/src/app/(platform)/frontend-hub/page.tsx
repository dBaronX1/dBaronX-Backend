import { QuickLinkGrid } from "@/components/platform/QuickLinkGrid";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default function FrontendHubPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Frontend Hub"
        title="Launch Surface Directory"
        description="Top-level frontend directory for e-commerce, affiliate, watch-to-earn, AI Stories, campaigns, settlements, and launch closure surfaces."
      />

      <LowBandwidthNotice />

      <QuickLinkGrid
        title="Frontend Launch Surfaces"
        items={[
          {
            href: "/ecommerce-dashboard",
            title: "E-commerce Dashboard",
            description: "Storefront product, order, variant, and fulfillment surface.",
          },
          {
            href: "/storefront-launch",
            title: "Storefront Launch",
            description: "Commerce launch and backend health surface.",
          },
          {
            href: "/affiliate-dashboard",
            title: "Affiliate Dashboard",
            description: "Affiliate payouts and performance visibility.",
          },
          {
            href: "/watch-dashboard",
            title: "Watch Dashboard",
            description: "Watch-to-earn reward and FastAPI readiness surface.",
          },
          {
            href: "/watch-session",
            title: "Watch Session",
            description: "Session lifecycle and reward-state interaction surface.",
          },
          {
            href: "/ai-stories-dashboard",
            title: "AI Stories Dashboard",
            description: "Story and campaign operations surface.",
          },
          {
            href: "/ai-stories-create",
            title: "AI Stories Create",
            description: "Campaign creation and creative planning surface.",
          },
          {
            href: "/campaign-performance",
            title: "Campaign Performance",
            description: "Ads and AI Stories performance visibility.",
          },
          {
            href: "/frontend-closure",
            title: "Frontend Closure",
            description: "Frontend launch-phase readiness closure.",
          },
        ]}
      />
    </main>
  );
}
