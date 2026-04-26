interface SystemSnapshotCardsProps {
  items: Array<{
    label: string;
    value: string | number;
    helper?: string;
  }>;
}

export function SystemSnapshotCards({ items }: SystemSnapshotCardsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <article key={item.label} className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            {item.label}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight">{item.value}</p>
          {item.helper ? (
            <p className="mt-2 text-xs text-neutral-600">{item.helper}</p>
          ) : null}
        </article>
      ))}
    </section>
  );
}
