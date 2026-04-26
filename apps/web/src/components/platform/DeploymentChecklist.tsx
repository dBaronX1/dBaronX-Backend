import { StatusPill } from "@/components/platform/StatusPill";

interface DeploymentChecklistItem {
  key: string;
  label: string;
  helper: string;
  ready: boolean;
}

export function DeploymentChecklist({
  items,
}: {
  items: DeploymentChecklistItem[];
}) {
  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold">Deployment Checklist</h2>

      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article key={item.key} className="rounded-2xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="mt-1 text-xs text-neutral-600">{item.helper}</p>
              </div>
              <StatusPill ready={item.ready} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
