export function LaunchBlockerList({
  blockers,
  title = "Launch Blockers",
}: {
  blockers: string[];
  title?: string;
}) {
  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>

      {blockers.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-600">
          No blockers currently reported.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {blockers.map((blocker) => (
            <li
              key={blocker}
              className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900"
            >
              {blocker}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
