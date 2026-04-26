import { StatusPill } from "@/components/platform/StatusPill";

export function GoLiveDecisionCard({
  frontendClosed,
  launchClosed,
  medusaBoundaryReady,
  medusaReconciliationReady,
}: {
  frontendClosed: boolean;
  launchClosed: boolean;
  medusaBoundaryReady: boolean;
  medusaReconciliationReady: boolean;
}) {
  const ready =
    frontendClosed &&
    launchClosed &&
    medusaBoundaryReady &&
    medusaReconciliationReady;

  const items = [
    { label: "Frontend", ready: frontendClosed },
    { label: "Launch", ready: launchClosed },
    { label: "Medusa Boundary", ready: medusaBoundaryReady },
    { label: "Medusa Reconciliation", ready: medusaReconciliationReady },
  ];

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Go-Live Decision</h2>
          <p className="text-sm text-neutral-600">
            Composite late-stage release decision across frontend, launch, and Medusa closure.
          </p>
        </div>
        <StatusPill ready={ready} readyLabel="Ready" blockedLabel="Blocked" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <article key={item.label} className="rounded-2xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{item.label}</p>
              <StatusPill ready={item.ready} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
