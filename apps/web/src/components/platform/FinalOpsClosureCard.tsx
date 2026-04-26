import { StatusPill } from "@/components/platform/StatusPill";

export function FinalOpsClosureCard({
  closed,
  blockerCount,
}: {
  closed: boolean;
  blockerCount: number;
}) {
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Final Ops Closure</h2>
          <p className="text-sm text-neutral-600">
            Composite late-stage launch hardening closure across frontend, launch, Medusa, and startup gate.
          </p>
        </div>
        <StatusPill ready={closed} readyLabel="Closed" blockedLabel="Open" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl bg-neutral-50 p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Closure State
          </p>
          <p className="mt-2 text-2xl font-bold">
            {closed ? "Closed" : "Open"}
          </p>
        </article>

        <article className="rounded-2xl bg-neutral-50 p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Blockers
          </p>
          <p className="mt-2 text-2xl font-bold">{blockerCount}</p>
        </article>
      </div>
    </section>
  );
}
