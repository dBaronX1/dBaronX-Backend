import { LaunchStatusBanner } from "@/components/platform/LaunchStatusBanner";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { QuickLinkGrid } from "@/components/platform/QuickLinkGrid";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getLaunchClosure } from "@/lib/platform/platform-api";

export const dynamic = "force-dynamic";

export default async function PlatformIndexPage() {
  const launch = await getLaunchClosure();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="dBaronX Platform"
        title="Frontend Launch Surfaces"
        description="Operational frontend entrypoint across platform, affiliate, watch-to-earn, AI Stories, commerce, suppliers, payments, and launch closure."
      />

      <LowBandwidthNotice />
      <LaunchStatusBanner ready={launch.ready} blockers={launch.blockers} />

      <QuickLinkGrid
        title="Primary Surfaces"
        items={[
          {
            href: "/dashboard",
            title: "Dashboard",
            description: "Unified launch and operational overview",
          },
          {
            href: "/launch",
            title: "Launch",
            description: "Launch blockers and FastAPI handoff visibility",
          },
          {
            href: "/affiliate-ops",
            title: "Affiliate",
            description: "Payout and affiliate operations",
          },
          {
            href: "/watch-ops",
            title: "Watch-to-Earn",
            description: "Watch session and reward operations",
          },
          {
            href: "/ads-ops",
            title: "Ads",
            description: "Campaign budget and spend operations",
          },
          {
            href: "/ai-stories-ops",
            title: "AI Stories",
            description: "Story and campaign operations",
          },
          {
            href: "/commerce-ops",
            title: "Commerce",
            description: "Commerce sync and settlement surface",
          },
          {
            href: "/wallet-ops",
            title: "Wallet",
            description: "Ledger, hold, and balance operations",
          },
          {
            href: "/payments-ops",
            title: "Payments",
            description: "Checkout settlement surface",
          },
        ]}
      />
    </main>
  );
}
