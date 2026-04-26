interface StateTimelineItem {
  label: string;
  helper: string;
  active?: boolean;
  complete?: boolean;
}

export function StateTimeline({
  title,
  items,
}: {
  title: string;
  items: StateTimelineItem[];
}) {
  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>

      <div className="mt-4 space-y-3">
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`} className="flex items-start gap-3">
            <div
              className={`mt-1 h-3 w-3 rounded-full ${
                item.complete
                  ? "bg-emerald-500"
                  : item.active
                    ? "bg-sky-500"
                    : "bg-neutral-300"
              }`}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-neutral-600">{item.helper}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
