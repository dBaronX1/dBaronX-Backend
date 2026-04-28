import { ProductReviews } from "@/components/platform/ProductReviews";
import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { StorefrontCatalogCards } from "@/components/platform/StorefrontCatalogCards";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";
import { TraceabilityQR } from "@/components/platform/TraceabilityQR";
import { getStorefrontCatalogSummary } from "@/lib/storefront/storefront-api";

export const dynamic = "force-dynamic";

function buildSyntheticReviews(products: Record<string, unknown>[]) {
  return products.slice(0, 8).map((product, index) => {
    const productLabel = String(product.title ?? product.name ?? product.handle ?? `Product ${index + 1}`);
    const productId = String(product.id ?? product.handle ?? `product-${index + 1}`);
    const rating = 3 + ((index + 1) % 3);

    return {
      id: `${productId}-review-${index}`,
      author: `Storefront user ${index + 1}`,
      rating,
      title: `${productLabel} review summary`,
      body:
        rating >= 4
          ? "Consistent mirrored catalog data and launch-safe product details."
          : "Product metadata is available, but should be validated for richer merchandising context.",
      createdAt: new Date(Date.now() - index * 86400000).toISOString(),
      verifiedPurchase: index % 2 === 0,
      helpfulCount: 2 + index,
    };
  });
}

export default async function StorefrontCatalogPage() {
  const summary = await getStorefrontCatalogSummary();
  const reviews = buildSyntheticReviews(summary.recentProducts);
  const primaryProduct = summary.recentProducts[0] ?? {};

  const traceabilityProductId = String(primaryProduct.id ?? primaryProduct.handle ?? "catalog-product");
  const traceabilityLotCode = String(primaryProduct.sku ?? primaryProduct.variant_sku ?? "lot-pending");
  const traceabilityOrigin = String(primaryProduct.origin ?? "mirrored-storefront-catalog");

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Storefront Catalog"
        title="Catalog Readiness Surface"
        description="Frontend catalog surface for mirrored products, variants, and launch-grade storefront hardening."
      />

      <LowBandwidthNotice />

      <SurfaceTabs
        tabs={[
          { href: "/storefront-catalog", label: "Catalog" },
          { href: "/ecommerce-dashboard", label: "Dashboard" },
          { href: "/storefront-launch", label: "Launch" },
          { href: "/orders", label: "Orders" },
        ]}
      />

      <StorefrontCatalogCards summary={summary} />

      <section className="grid gap-4 lg:grid-cols-2">
        <ProductReviews title="Catalog Review Signals" reviews={reviews} />
        <TraceabilityQR
          title="Traceability Payload"
          productId={traceabilityProductId}
          lotCode={traceabilityLotCode}
          origin={traceabilityOrigin}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Recent Products" payload={summary.recentProducts} />
        <JsonPanel title="Recent Variants" payload={summary.recentVariants} />
      </section>
    </main>
  );
}
