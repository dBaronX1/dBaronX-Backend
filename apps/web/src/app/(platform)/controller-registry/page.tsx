import { ContractRuleList } from "@/components/platform/ContractRuleList";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getControllerRegistry } from "@/lib/finalization/finalization-readiness-api";

export const dynamic = "force-dynamic";

export default async function ControllerRegistryPage() {
  const registry = await getControllerRegistry();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Controller Registry"
        title="Canonical Controller Registry Surface"
        description="Registry inspection surface confirming newly introduced finalization controllers are mounted into the canonical app shell."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 lg:grid-cols-2">
        <ContractRuleList
          title="Commerce Finalization Controllers"
          rules={registry.controllerRegistry.commerce}
        />
        <ContractRuleList
          title="System Finalization Controllers"
          rules={registry.controllerRegistry.system}
        />
      </section>
    </main>
  );
}
