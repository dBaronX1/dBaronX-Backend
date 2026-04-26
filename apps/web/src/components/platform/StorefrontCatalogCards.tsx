import { OperationalMetricCard } from "@/components/platform/OperationalMetricCard";
import type { StorefrontCatalogSummary } from "@/lib/storefront/storefront-api";

export function StorefrontCatalogCards({
  summary,
}: {
  summary: StorefrontCatalogSummary;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <OperationalMetricCard
        label="Catalog Products"
        value={summary.productSyncCount}
        helper="Mirrored products available to storefront surfaces"
      />
      <OperationalMetricCard
        label="Catalog Variants"
        value={summary.variantSyncCount}
        helper="Mirrored variants available to pricing and fulfillment flows"
      />
      <OperationalMetricCard
        label="Recent Products"
        value={summary.recentProducts.length}
        helper="Products currently visible in the backend mirror"
      />
      <OperationalMetricCard
        label="Recent Variants"
        value={summary.recentVariants.length}
        helper="Variants currently visible in the backend mirror"
      />
    </section>
  );
}
