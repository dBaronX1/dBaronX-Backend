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


function buildProductCards(products: Record<string, unknown>[]) {
  return products.map((product, index) => {
    const variants = Array.isArray(product.variants) ? (product.variants as Record<string, unknown>[]) : [];
    const firstVariant = variants[0] || {};
    const variantPrices = Array.isArray(firstVariant.prices) ? (firstVariant.prices as Record<string, unknown>[]) : [];
    const firstPrice = variantPrices.find((price) => Number(price.amount ?? 0) > 0) || variantPrices[0] || {};
    const calculated = (firstVariant.calculated_price as Record<string, unknown> | undefined) || {};
    const calculatedSet = (firstVariant.calculated_price_set as Record<string, unknown> | undefined) || {};
    const calcAmount = Number(calculated.calculated_amount ?? calculated.amount ?? calculatedSet.amount ?? 0);
    const rawPriceAmount = Number(firstPrice.amount ?? 0);
    const priceAmount = calcAmount > 0 ? calcAmount : rawPriceAmount;
    const currency = String(calculated.currency_code ?? calculatedSet.currency_code ?? firstPrice.currency_code ?? "usd").toUpperCase();
    const inventoryQty = Number(firstVariant.inventory_quantity ?? firstVariant.inventoryQuantity ?? firstVariant.stocked_quantity ?? -1);
    const manageInventory = Boolean(firstVariant.manage_inventory ?? firstVariant.manageInventory ?? false);
    const backorder = Boolean(firstVariant.allow_backorder ?? firstVariant.allowBackorder ?? false);
    const inStock = manageInventory ? inventoryQty > 0 || backorder : true;
    const pMeta = (product.metadata as Record<string, unknown> | undefined) || {};
    const vMeta = (firstVariant.metadata as Record<string, unknown> | undefined) || {};
    const supplierRef = String(pMeta.supplierRef ?? pMeta.supplier ?? pMeta.supplier_ref ?? vMeta.supplierRef ?? vMeta.supplier ?? vMeta.supplier_ref ?? "n/a");
    const degraded = [priceAmount > 0 ? null : "price_pending", inStock ? null : "out_of_stock", supplierRef !== "n/a" ? null : "supplier_n/a"].filter(Boolean).join(", ");
    return {
      key: String(product.id ?? product.handle ?? index),
      title: String(product.title ?? "Untitled Product"),
      handle: String(product.handle ?? "pending-handle"),
      variantId: String(firstVariant.id ?? "variant-pending"),
      priceLabel: priceAmount > 0 ? `${(priceAmount / 100).toFixed(2)} ${currency}` : "Price pending",
      image: String(product.thumbnail ?? ""),
      availability: inStock ? "Available" : "Out of stock",
      supplierRef,
      degradedReason: degraded || "ready",
    };
  });
}

export default async function StorefrontCatalogPage() {
  const summary = await getStorefrontCatalogSummary();
  const reviews = buildSyntheticReviews(summary.recentProducts);
  const primaryProduct = summary.recentProducts[0] ?? {};
  const productCards = buildProductCards(summary.recentProducts);

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

      {summary.degradedReason ? (
        <section className="rounded-xl border border-amber-600/60 bg-amber-950/20 p-4 text-sm text-amber-200">
          Degraded catalog mode: {summary.degradedReason}
        </section>
      ) : null}

      {productCards.length === 0 ? (
        <section className="rounded-xl border border-dashed border-zinc-700 bg-zinc-900/30 p-4 text-sm text-zinc-300">
          Products coming soon. Catalog seed/import can be run once Medusa product data is ready.
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {productCards.slice(0, 8).map((item) => (
            <article key={item.key} className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <p className="text-sm font-semibold text-zinc-100">{item.title}</p>
              <p className="text-xs text-zinc-400">/{item.handle}</p>
              <p className="mt-2 text-sm text-zinc-200">{item.priceLabel}</p>
              <p className="text-xs text-zinc-400">Variant: {item.variantId}</p>
              <p className="text-xs text-zinc-400">Stock: {item.availability}</p>
              <p className="text-xs text-zinc-400">Supplier: {item.supplierRef}</p>
              <p className="text-xs text-zinc-500">Image: {item.image || "fallback-placeholder"}</p>
              <p className="text-xs text-amber-300">Status: {item.degradedReason}</p>
            </article>
          ))}
        </section>
      )}

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
