import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getStorefrontCatalogSummary, getStorefrontOrderSummary } from "@/lib/storefront/storefront-api";

export const dynamic = "force-dynamic";

export default async function StorefrontMobilePage() {
  const [catalog, orders] = await Promise.all([
    getStorefrontCatalogSummary(),
    getStorefrontOrderSummary(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-5">
      <SectionHeader
        eyebrow="Storefront Mobile"
        title="Mobile Commerce Surface"
        description="Compressed storefront operations surface optimized for smaller screens and low-bandwidth conditions."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Catalog mirror"
        description={`Products: ${catalog.productSyncCount} • Variants: ${catalog.variantSyncCount}`}
      />

      <OperationalBanner
        title="Order mirror"
        description={`Orders: ${orders.orderSyncCount} • Fulfillments: ${orders.fulfillmentSyncCount}`}
      />

      <section className="space-y-3">
        {orders.recentOrders.slice(0, 8).map((order, index) => (
          <article
            key={`${String(order.id ?? order.medusa_order_id ?? index)}`}
            className="rounded-2xl border bg-white p-4 shadow-sm"
          >
            <p className="text-sm font-semibold">
              {String(order.id ?? order.medusa_order_id ?? "n/a")}
            </p>
            <p className="mt-1 text-xs text-neutral-600">
              status: {String(order.order_status ?? order.status ?? "unknown")}
            </p>
            <p className="mt-1 text-xs text-neutral-600">
              payment: {String(order.payment_status ?? "n/a")}
            </p>
            <p className="mt-1 text-xs text-neutral-600">
              fulfillment: {String(order.fulfillment_status ?? "n/a")}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
