import { getCommerceAdminDashboard } from "@/lib/platform/platform-api";

export const dynamic = "force-dynamic";

export default async function CommerceOpsPage() {
  const commerce = await getCommerceAdminDashboard();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
          Commerce Operations
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Commerce Mirror and Settlement Surface
        </h1>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Order Sync", commerce.orderSyncCount],
          ["Product Sync", commerce.productSyncCount],
          ["Variant Sync", commerce.variantSyncCount],
          ["Fulfillment Sync", commerce.fulfillmentSyncCount],
          ["Settlements", commerce.settlementCount],
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl border bg-white p-4 shadow-sm">
            <p className="text-sm text-neutral-600">{label}</p>
            <p className="mt-2 text-2xl font-bold">{String(value)}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold">Settlement Totals</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-neutral-50 p-3 text-xs text-neutral-700">
            {JSON.stringify(commerce.settlementTotals, null, 2)}
          </pre>
        </article>

        <article className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold">Recent Settlements</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-neutral-50 p-3 text-xs text-neutral-700">
            {JSON.stringify(commerce.recentSettlements.slice(0, 10), null, 2)}
          </pre>
        </article>
      </section>
    </main>
  );
}
