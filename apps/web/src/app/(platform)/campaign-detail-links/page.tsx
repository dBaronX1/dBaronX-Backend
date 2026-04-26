import { QuickLinkGrid } from "@/components/platform/QuickLinkGrid";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default function CampaignDetailLinksPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Campaign Detail Links"
        title="Direct Campaign Detail Surfaces"
        description="Entry surface for AI story distribution packs and ad billing packs."
      />

      <LowBandwidthNotice />

      <QuickLinkGrid
        title="Detail Surface Patterns"
        items={[
          {
            href: "/ai-stories-campaign/sample-campaign-id",
            title: "AI Stories Campaign Detail",
            description: "Distribution pack surface for a story campaign identifier.",
          },
          {
            href: "/ads-campaign/sample-campaign-id",
            title: "Ads Campaign Detail",
            description: "Billing pack surface for an ad campaign identifier.",
          },
        ]}
      />
    </main>
  );
}
