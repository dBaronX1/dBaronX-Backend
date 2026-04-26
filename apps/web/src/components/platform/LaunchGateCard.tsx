import { StatusPill } from "@/components/platform/StatusPill";

export function LaunchGateCard({
  ready,
  blockers,
}: {
  ready: boolean;
  blockers: string[];
}) {
  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Launch Gate</h2>
          <p className="text-sm text-neutral-600">
            Final launch gate view for frontend decision visibility.
          </p>
        </div>
        <StatusPill ready={ready} readyLabel="Open" blockedLabel="Blocked" />
      </div>

      <div className="mt-4">
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Blocker Count
        </p>
        <p className="mt-1 text-2xl font-bold">{blockers.length}</p>
      </div>
    </section>
  );
}
