import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getControllerRegistry } from "@/lib/finalization/finalization-readiness-api";
import { getFinalVerificationPack } from "@/lib/finalization/final-verification-pack-api";

export const dynamic = "force-dynamic";

export default async function AppShellWiringPage() {
  const [verification, registry] = await Promise.all([
    getFinalVerificationPack(),
    getControllerRegistry(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="App Shell Wiring"
        title="Canonical App Shell Wiring Surface"
        description="Final inspection surface for mounted controllers, wiring visibility, and finalization integration through the canonical NestJS shell."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel
          title="App Shell Wiring"
          payload={verification.finalVerificationPack.appShellWiring}
        />
        <JsonPanel
          title="Controller Registry"
          payload={registry.controllerRegistry}
        />
      </section>
    </main>
  );
}
