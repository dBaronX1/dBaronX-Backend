import { JsonPanel } from "@/components/platform/JsonPanel";
import { LaunchBlockerList } from "@/components/platform/LaunchBlockerList";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getFinalVerificationPack } from "@/lib/finalization/final-verification-pack-api";

export const dynamic = "force-dynamic";

export default async function FinalVerificationPackPage() {
  const payload = await getFinalVerificationPack();
  const pack = payload.finalVerificationPack;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Final Verification Pack"
        title="Final Verification Pack Surface"
        description="Final proof surface that remaining closure packs are integrated, retrievable, and consistent."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Verification pack state"
        description={
          pack.closed
            ? "Final verification pack currently reports closed."
            : "Final verification pack remains open."
        }
        tone={pack.closed ? "success" : "warning"}
      />

      <LaunchBlockerList
        blockers={pack.blockers}
        title="Final Verification Blockers"
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Checks" payload={pack.checks} />
        <JsonPanel title="Canonical Completion" payload={pack.canonicalCompletion} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Finalization Readiness" payload={pack.finalizationReadiness} />
        <JsonPanel title="Controller Registry" payload={pack.controllerRegistry} />
      </section>
    </main>
  );
}
