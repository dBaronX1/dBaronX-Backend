import { StatusPill } from "@/components/platform/StatusPill";

interface LaunchDomainSummaryCardsProps {
  items: Array<{
    key: string;
    label: string;
    ready: boolean;
    description: string;
  }>;
}

export function LaunchDomainSummaryCards({
  items,
}: LaunchDomainSummaryCardsProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <article key={item.key} className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">{item.label}</h2>
              <p className="mt-1 text-sm text-neutral-600">{item.description}</p>
            </div>
            <StatusPill ready={item.ready} />
          </div>
        </article>
      ))}
    </section>
  );
}
