import { StatusPill } from "@/components/platform/StatusPill";
import type { FrontendPhaseState } from "@/lib/frontend/frontend-phase-state";

export function FrontendClosureSummary({
  state,
}: {
  state: FrontendPhaseState;
}) {
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Frontend Closure Summary</h2>
          <p className="text-sm text-neutral-600">
            Current launch-phase closure across frontend critical surfaces.
          </p>
        </div>
        <StatusPill ready={state.closed} readyLabel="Closed" blockedLabel="Open" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {state.checks.map((check) => (
          <article key={check.key} className="rounded-2xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{check.label}</p>
              <StatusPill ready={check.ready} />
            </div>
            <p className="mt-2 text-xs text-neutral-600">{check.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
