import { ReadinessGrid } from "@/components/platform/ReadinessGrid";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getReadinessMatrix } from "@/lib/platform/platform-api";

export const dynamic = "force-dynamic";

export default async function ReleaseReadinessMatrixPage() {
  const matrix = await getReadinessMatrix();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Release Readiness Matrix"
        title="Release Readiness Matrix Surface"
        description="Late-stage release matrix for wallet, payouts, payments, suppliers, ads, AI stories, commerce, and launch closure."
      />

      <LowBandwidthNotice />
      <ReadinessGrid matrix={matrix} />
    </main>
  );
}
