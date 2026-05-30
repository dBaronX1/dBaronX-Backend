import type { MedusaStoreProduct, StoreProductVariant } from "@/lib/api/medusa-store-client";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function positiveNumber(value: unknown): number | null {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function medusaProductMetadata(product: MedusaStoreProduct | null | undefined): Record<string, unknown> {
  return record(product?.metadata);
}

export function medusaVariantMetadata(variant: StoreProductVariant | null | undefined): Record<string, unknown> {
  return record(variant?.metadata);
}

export function firstMedusaVariant(product: MedusaStoreProduct | null | undefined): StoreProductVariant | null {
  return Array.isArray(product?.variants) ? product.variants.find((variant) => Boolean(variant?.id)) || product.variants[0] || null : null;
}

export function firstMedusaVariantId(product: MedusaStoreProduct | null | undefined): string {
  const direct = typeof product?.defaultVariantId === "string" ? product.defaultVariantId.trim() : "";
  if (direct) return direct;
  const variant = firstMedusaVariant(product);
  return typeof variant?.id === "string" ? variant.id.trim() : "";
}

export function firstMedusaPriceMinor(product: MedusaStoreProduct | null | undefined): { amount: number | null; currencyCode: string } {
  const productCurrency = String(product?.currencyCode || "usd").toLowerCase();
  const variant = firstMedusaVariant(product);
  const calculated = record(variant?.calculated_price);
  const calculatedAmount = positiveNumber(
    calculated.calculated_amount ??
      calculated.amount ??
      calculated.original_amount ??
      record(calculated.calculated_price).amount ??
      record(calculated.price).amount,
  );
  if (calculatedAmount) {
    return {
      amount: calculatedAmount,
      currencyCode: String(calculated.currency_code ?? calculated.currency ?? productCurrency).toLowerCase(),
    };
  }

  const prices = Array.isArray(variant?.prices) ? variant.prices : [];
  const price = prices.find((item) => positiveNumber(item?.amount));
  if (price) return { amount: Number(price.amount), currencyCode: String(price.currency_code || productCurrency).toLowerCase() };

  const productPriceMinor = positiveNumber(product?.priceMinor);
  if (productPriceMinor) return { amount: productPriceMinor, currencyCode: productCurrency };

  const productPrice = positiveNumber(product?.price);
  if (productPrice) return { amount: productPrice >= 100 ? productPrice : Math.round(productPrice * 100), currencyCode: productCurrency };

  return { amount: null, currencyCode: productCurrency };
}

export function medusaStockReady(product: MedusaStoreProduct | null | undefined): boolean {
  const variant = firstMedusaVariant(product);
  if (!variant) return false;
  if (variant.manage_inventory === false) return true;
  return [product?.inventoryQuantity, variant.inventory_quantity, variant.stocked_quantity, variant.available_quantity].some((value) => Number(value) > 0);
}
