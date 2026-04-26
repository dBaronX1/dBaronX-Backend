interface LaunchAuditSummaryCardProps {
  summary: Record<string, unknown>;
}

export function LaunchAuditSummaryCard({
  summary,
}: LaunchAuditSummaryCardProps) {
  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold">Launch Audit Summary</h2>

      <div className="mt-4 grid gap-2">
        {Object.entries(summary).length === 0 ? (
          <p className="text-sm text-neutral-600">No summary values available.</p>
        ) : (
          Object.entries(summary).map(([key, value]) => (
            <div
              key={key}
              className="flex items-start justify-between gap-3 rounded-xl bg-neutral-50 px-3 py-2"
            >
              <span className="text-sm font-medium text-neutral-700">{key}</span>
              <span className="max-w-full break-words text-sm text-neutral-600">
                {typeof value === "object" ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
