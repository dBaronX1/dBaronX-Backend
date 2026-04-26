import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getCommerceFinalClosureReadiness } from "@/lib/finalization/canonical-completion-api";
import { getMedusaFinalClosurePack } from "@/lib/medusa/medusa-final-closure-api";

export const dynamic = "force-dynamic";

export default async function MedusaConfirmationPage() {
  const [readiness, pack] = await Promise.all([
    getCommerceFinalClosureReadiness(),
    getMedusaFinalClosurePack(),
  ]);

  const closed =
    readiness.commerceFinalClosureReadiness.closed &&
    pack.medusaFinalClosurePack.closed;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Medusa Confirmation"
        title="Medusa Closure Confirmation Surface"
        description="Final confirmation surface that Medusa bridge closure is complete and integrated."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Medusa confirmation state"
        description={
          closed
            ? "Medusa closure currently reports confirmed."
            : "Medusa closure confirmation remains open."
        }
        tone={closed ? "success" : "warning"}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel
          title="Commerce Final Closure Readiness"
          payload={readiness.commerceFinalClosureReadiness}
        />
        <JsonPanel
          title="Medusa Final Closure Pack"
          payload={pack.medusaFinalClosurePack}
        />
      </section>
    </main>
  );
}
