import { OperationalMetricCard } from "@/components/platform/OperationalMetricCard";
import type { StorefrontOrderSummary } from "@/lib/storefront/storefront-api";

export function StorefrontOrderCards({
  summary,
}: {
  summary: StorefrontOrderSummary;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <OperationalMetricCard
        label="Order Mirrors"
        value={summary.orderSyncCount}
        helper="Orders mirrored from commerce-only backend"
      />
      <OperationalMetricCard
        label="Fulfillment Mirrors"
        value={summary.fulfillmentSyncCount}
        helper="Fulfillment state mirrored for storefront visibility"
      />
      <OperationalMetricCard
        label="Recent Orders"
        value={summary.recentOrders.length}
        helper="Order records currently visible to launch surfaces"
      />
      <OperationalMetricCard
        label="Recent Fulfillments"
        value={summary.recentFulfillments.length}
        helper="Fulfillment records currently visible to launch surfaces"
      />
    </section>
  );
}
