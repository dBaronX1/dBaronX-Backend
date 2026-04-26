import type { ReleaseRiskItem } from "@/lib/release/release-risks";

export function ReleaseRiskBoard({
  items,
}: {
  items: ReleaseRiskItem[];
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {items.map((item) => {
        const tone =
          item.severity === "high"
            ? "border-rose-300 bg-rose-50"
            : item.severity === "medium"
              ? "border-amber-300 bg-amber-50"
              : "border-sky-300 bg-sky-50";

        return (
          <article key={item.key} className={`rounded-2xl border p-4 shadow-sm ${tone}`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">{item.title}</h2>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium uppercase tracking-wide">
                {item.severity}
              </span>
            </div>
            <p className="mt-2 text-sm text-neutral-700">{item.description}</p>
          </article>
        );
      })}
    </section>
  );
}
