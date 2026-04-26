import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getFinalLaunchClosure } from "@/lib/launch/final-launch-closure-api";

export const dynamic = "force-dynamic";

export default async function FinalLaunchClosurePage() {
  const payload = await getFinalLaunchClosure();
  const closure = payload.finalLaunchClosure;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Final Launch Closure"
        title="Final Launch Closure Surface"
        description="Aggregate closure surface across final launch closure and shell closure."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Final closure state"
        description={
          closure.closed
            ? "Final launch closure currently reports closed."
            : "Final launch closure currently reports open."
        }
        tone={closure.closed ? "success" : "warning"}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Launch Closure" payload={closure.launchClosure} />
        <JsonPanel title="Shell Closure" payload={closure.shellClosure} />
      </section>
    </main>
  );
}
