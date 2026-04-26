import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionCountGrid } from "@/components/platform/SectionCountGrid";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getSystemAdminSummary } from "@/lib/ops/ops-snapshot-api";

export const dynamic = "force-dynamic";

export default async function AdminSummaryPage() {
  const payload = await getSystemAdminSummary();
  const summary = payload.systemAdminSummary;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Admin Summary"
        title="System Admin Summary Surface"
        description="Frontend inspection surface for wallet, payouts, payments, suppliers, ads, AI Stories, and commerce admin summaries."
      />

      <LowBandwidthNotice />

      <SectionCountGrid
        title="Summary Sections"
        counts={[
          { label: "Wallet", value: Object.keys(summary.wallet ?? {}).length },
          { label: "Payouts", value: Object.keys(summary.payouts ?? {}).length },
          { label: "Payments", value: Object.keys(summary.payments ?? {}).length },
          { label: "Suppliers", value: Object.keys(summary.suppliers ?? {}).length },
          { label: "Ads", value: Object.keys(summary.ads ?? {}).length },
          { label: "AI Stories", value: Object.keys(summary.aiStories ?? {}).length },
          { label: "Commerce", value: Object.keys(summary.commerce ?? {}).length },
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Wallet" payload={summary.wallet} />
        <JsonPanel title="Payouts" payload={summary.payouts} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Ads" payload={summary.ads} />
        <JsonPanel title="AI Stories" payload={summary.aiStories} />
      </section>
    </main>
  );
}
