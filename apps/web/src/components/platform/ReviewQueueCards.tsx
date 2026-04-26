interface ReviewQueueCardsProps {
  title: string;
  items: Array<Record<string, unknown>>;
  statusKey?: string;
  scoreKey?: string;
}

export function ReviewQueueCards({
  title,
  items,
  statusKey = "status",
  scoreKey = "review_score",
}: ReviewQueueCardsProps) {
  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-neutral-600">
          Priority-oriented operational queue view.
        </p>
      </div>

      <div className="grid gap-3">
        {items.length === 0 ? (
          <p className="text-sm text-neutral-600">No queue items available.</p>
        ) : (
          items.slice(0, 10).map((item, index) => (
            <article
              key={`${String(item.id ?? item.campaign_id ?? item.campaignId ?? index)}`}
              className="rounded-2xl border p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    {String(item.id ?? item.campaign_id ?? item.campaignId ?? "n/a")}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {String(item[statusKey] ?? "unknown")}
                  </p>
                </div>

                <div className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
                  score: {String(item[scoreKey] ?? "n/a")}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
