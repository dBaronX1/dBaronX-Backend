import { StatusPill } from "@/components/platform/StatusPill";

export function ShellClosureCard({
  closed,
  blockers,
}: {
  closed: boolean;
  blockers: string[];
}) {
  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Shell Closure</h2>
          <p className="text-sm text-neutral-600">
            Final shell closure across platform, admin, ops, and readiness.
          </p>
        </div>
        <StatusPill ready={closed} readyLabel="Closed" blockedLabel="Open" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl bg-neutral-50 p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Blocker Count
          </p>
          <p className="mt-2 text-2xl font-bold">{blockers.length}</p>
        </article>

        <article className="rounded-2xl bg-neutral-50 p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Status
          </p>
          <p className="mt-2 text-2xl font-bold">
            {closed ? "Closed" : "Open"}
          </p>
        </article>
      </div>
    </section>
  );
}
