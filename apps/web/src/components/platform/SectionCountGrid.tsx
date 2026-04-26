interface SectionCountGridProps {
  title: string;
  counts: Array<{
    label: string;
    value: string | number;
  }>;
}

export function SectionCountGrid({
  title,
  counts,
}: SectionCountGridProps) {
  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {counts.map((item) => (
          <article key={item.label} className="rounded-2xl bg-neutral-50 p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-bold">{item.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
