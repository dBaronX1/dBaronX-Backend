import { StatusPill } from "@/components/platform/StatusPill";

interface SurfaceChecklistItem {
  key: string;
  label: string;
  description: string;
  ready: boolean;
}

export function SurfaceChecklist({
  title,
  items,
}: {
  title: string;
  items: SurfaceChecklistItem[];
}) {
  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>

      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article key={item.key} className="rounded-2xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="mt-1 text-xs text-neutral-600">
                  {item.description}
                </p>
              </div>
              <StatusPill ready={item.ready} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
