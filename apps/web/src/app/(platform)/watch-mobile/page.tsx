import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getWatchSurfaceState } from "@/lib/watch/watch-api";

export const dynamic = "force-dynamic";

export default async function WatchMobilePage() {
  const state = await getWatchSurfaceState();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-5">
      <SectionHeader
        eyebrow="Watch Mobile"
        title="Mobile Watch Surface"
        description="Compressed watch-to-earn readiness and reward visibility for smaller screens."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Watch readiness"
        tone={state.launchReady && state.fastapiClosed ? "success" : "warning"}
        description={`Launch Ready: ${state.launchReady ? "YES" : "NO"} • FastAPI Closed: ${state.fastapiClosed ? "YES" : "NO"} • Enforcement: ${state.fastapiEnforcementClosed ? "YES" : "NO"}`}
      />

      <section className="space-y-3">
        {state.launchBlockers.slice(0, 8).map((blocker) => (
          <article
            key={blocker}
            className="rounded-2xl border bg-white p-4 text-sm shadow-sm"
          >
            {blocker}
          </article>
        ))}
      </section>
    </main>
  );
}
