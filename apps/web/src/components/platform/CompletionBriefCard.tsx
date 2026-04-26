import { StatusPill } from "@/components/platform/StatusPill";

export function CompletionBriefCard({
  aligned,
  blockerCount,
  completionBand,
  nextAction,
}: {
  aligned: boolean;
  blockerCount: number;
  completionBand: string;
  nextAction: string;
}) {
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Completion Brief</h2>
          <p className="text-sm text-neutral-600">
            Final summarized backend brief for canonical completion.
          </p>
        </div>
        <StatusPill ready={aligned} readyLabel="Aligned" blockedLabel="Open" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl bg-neutral-50 p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Blockers
          </p>
          <p className="mt-2 text-2xl font-bold">{blockerCount}</p>
        </article>

        <article className="rounded-2xl bg-neutral-50 p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Completion Band
          </p>
          <p className="mt-2 text-lg font-bold break-words">{completionBand}</p>
        </article>

        <article className="rounded-2xl bg-neutral-50 p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            Next Action
          </p>
          <p className="mt-2 text-lg font-bold break-words">{nextAction}</p>
        </article>
      </div>
    </section>
  );
}
