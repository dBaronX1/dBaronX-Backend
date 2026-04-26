interface TraceSnapshotTableProps {
  title: string;
  rows: Array<Record<string, unknown>>;
  idKey?: string;
  secondaryKey?: string;
  tertiaryKey?: string;
}

export function TraceSnapshotTable({
  title,
  rows,
  idKey = "id",
  secondaryKey = "created_at",
  tertiaryKey = "flow_type",
}: TraceSnapshotTableProps) {
  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-neutral-600">No rows available.</p>
      ) : (
        <div className="space-y-3">
          {rows.slice(0, 12).map((row, index) => (
            <article
              key={`${String(row[idKey] ?? index)}`}
              className="rounded-2xl border p-4"
            >
              <p className="text-sm font-semibold">
                {String(row[idKey] ?? "n/a")}
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                {secondaryKey}: {String(row[secondaryKey] ?? "n/a")}
              </p>
              <p className="mt-1 text-xs text-neutral-600">
                {tertiaryKey}: {String(row[tertiaryKey] ?? "n/a")}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
