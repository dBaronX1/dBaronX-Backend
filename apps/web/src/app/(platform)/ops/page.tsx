import { getFastapiHandoffPack, getLaunchClosure, getReadinessMatrix } from "@/lib/platform/platform-api";
import { LaunchStatusBanner } from "@/components/platform/LaunchStatusBanner";
import { ReadinessGrid } from "@/components/platform/ReadinessGrid";

export const dynamic = "force-dynamic";

export default async function OpsPage() {
  const [launch, matrix, fastapi] = await Promise.all([
    getLaunchClosure(),
    getReadinessMatrix(),
    getFastapiHandoffPack(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
          dBaronX Operations
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Launch Operations Surface
        </h1>
        <p className="max-w-3xl text-sm text-neutral-600">
          Unified operational surface for launch blockers, system readiness,
          and FastAPI handoff visibility.
        </p>
      </header>

      <LaunchStatusBanner ready={launch.ready} blockers={launch.blockers} />

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold">FastAPI Handoff</h2>
          <div className="mt-3 space-y-2 text-sm">
            <p>
              Closed:{" "}
              <span className="font-medium">
                {fastapi.closed ? "YES" : "NO"}
              </span>
            </p>
            <p>
              Next Subsystem:{" "}
              <span className="font-medium">{fastapi.next_subsystem}</span>
            </p>
            <p>
              Enforcement Closed:{" "}
              <span className="font-medium">
                {fastapi.enforcement.closed ? "YES" : "NO"}
              </span>
            </p>
          </div>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-neutral-50 p-3 text-xs text-neutral-700">
            {JSON.stringify(fastapi.recommended_consumers, null, 2)}
          </pre>
        </article>

        <article className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold">Launch Closure Payload</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-neutral-50 p-3 text-xs text-neutral-700">
            {JSON.stringify(launch, null, 2)}
          </pre>
        </article>
      </section>

      <ReadinessGrid matrix={matrix} />
    </main>
  );
}
