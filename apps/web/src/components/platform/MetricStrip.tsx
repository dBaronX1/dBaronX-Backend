interface MetricStripItem {
  label: string;
  value: string | number;
}

export function MetricStrip({ items }: { items: MetricStripItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article
          key={item.label}
          className="rounded-2xl border bg-white p-4 shadow-sm"
        >
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            {item.label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{item.value}</p>
        </article>
      ))}
    </div>
  );
}
