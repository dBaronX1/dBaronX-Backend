import Link from "next/link";

export interface QuickLinkItem {
  href: string;
  title: string;
  description: string;
}

export function QuickLinkGrid({
  title,
  items,
}: {
  title: string;
  items: QuickLinkItem[];
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border bg-white p-4 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50"
          >
            <div className="text-sm font-semibold">{item.title}</div>
            <div className="mt-2 text-sm text-neutral-600">
              {item.description}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
