import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { ReleaseRiskBoard } from "@/components/platform/ReleaseRiskBoard";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { RELEASE_RISKS } from "@/lib/release/release-risks";

export const dynamic = "force-dynamic";

export default function ReleaseRisksPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Release Risks"
        title="Late-Stage Release Risk Surface"
        description="Risk view across the remaining hardening zones before final go-live."
      />

      <LowBandwidthNotice />
      <ReleaseRiskBoard items={RELEASE_RISKS} />
    </main>
  );
}
