import { JsonPanel } from "@/components/platform/JsonPanel";
import { LaunchBlockerList } from "@/components/platform/LaunchBlockerList";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";
import {
  getControllerRegistry,
  getFinalizationReadiness,
} from "@/lib/finalization/finalization-readiness-api";

export const dynamic = "force-dynamic";

export default async function FinalizationReadinessPage() {
  const [readiness, registry] = await Promise.all([
    getFinalizationReadiness(),
    getControllerRegistry(),
  ]);

  const payload = readiness.finalizationReadiness;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Finalization Readiness"
        title="Finalization Readiness Surface"
        description="Final readiness confirmation that closure packs are integrated through the canonical NestJS shell."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Finalization state"
        description={
          payload.closed
            ? "Finalization readiness currently reports closed."
            : "Finalization readiness remains open and still requires remaining checks."
        }
        tone={payload.closed ? "success" : "warning"}
      />

      <LaunchBlockerList
        blockers={payload.blockers}
        title="Finalization Blockers"
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Finalization Readiness" payload={payload} />
        <JsonPanel title="Controller Registry" payload={registry.controllerRegistry} />
      </section>
    </main>
  );
}
