import { ReviewQueueCards } from "@/components/platform/ReviewQueueCards";
import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";
import { getAffiliatePayoutOverview } from "@/lib/affiliate/affiliate-api";

export const dynamic = "force-dynamic";

export default async function AffiliateReviewQueuePage() {
  const payouts = await getAffiliatePayoutOverview();

  const queueItems = payouts.recentPayoutRequests.map((item, index) => ({
    ...item,
    review_score: Number(item.amount ?? 0) + (index + 1),
  }));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Affiliate Review Queue"
        title="Affiliate Review Queue Surface"
        description="Frontend queue surface for affiliate payout review, prioritization, and operational approval flow visibility."
      />

      <LowBandwidthNotice />

      <SurfaceTabs
        tabs={[
          { href: "/affiliate-dashboard", label: "Dashboard" },
          { href: "/affiliate-review", label: "Review" },
          { href: "/affiliate-review-queue", label: "Queue" },
          { href: "/affiliate-risk", label: "Risk" },
        ]}
      />

      <ReviewQueueCards title="Payout Review Queue" items={queueItems} scoreKey="review_score" />

      <JsonPanel
        title="Raw Queue Payload"
        payload={payouts.recentPayoutRequests}
      />
    </main>
  );
}
