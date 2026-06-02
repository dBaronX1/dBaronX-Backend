import { productPrimaryImage, productPrimaryVariantId, type StoreProduct } from "@/lib/store-products";

export const DBX_LOCAL_CART_KEY = "dbx_local_cart_v1";

export type DbxLocalCartItem = {
  productId: string;
  variantId: string;
  handle: string;
  title: string;
  imageUrl: string;
  thumbnail: string;
  images: { url?: string }[];
  priceMinor: number;
  currencyCode: string;
  quantity: number;
  buyable: boolean;
  selected: boolean;
};

export function cartItemFromProduct(product: StoreProduct, variantId = productPrimaryVariantId(product)): DbxLocalCartItem {
  const imageUrl = productPrimaryImage(product);
  const images = Array.isArray(product.images) ? product.images : imageUrl ? [{ url: imageUrl }] : [];
  return {
    productId: String(product.productId || product.id || ""),
    variantId: String(variantId || product.variantId || ""),
    handle: String(product.handle || ""),
    title: String(product.title || "dBaronX product"),
    imageUrl,
    thumbnail: String(product.thumbnail || imageUrl || ""),
    images,
    priceMinor: Number(product.priceMinor || 0),
    currencyCode: String(product.currencyCode || "usd").toLowerCase(),
    quantity: 1,
    buyable: product.buyable !== false && Boolean(variantId) && Number(product.priceMinor || 0) > 0,
    selected: true,
  };
}

export function readLocalCart(): DbxLocalCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(DBX_LOCAL_CART_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.map(normalizeCartItem).filter(Boolean) as DbxLocalCartItem[] : [];
  } catch {
    return [];
  }
}

export function writeLocalCart(items: DbxLocalCartItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DBX_LOCAL_CART_KEY, JSON.stringify(items.map(normalizeCartItem).filter(Boolean)));
}

export function normalizeCartItem(raw: unknown): DbxLocalCartItem | null {
  const item = raw && typeof raw === "object" ? raw as Partial<DbxLocalCartItem> & Record<string, unknown> : null;
  if (!item) return null;
  const variantId = String(item.variantId || "").trim();
  const priceMinor = Number(item.priceMinor || 0);
  if (!variantId || !Number.isFinite(priceMinor) || priceMinor <= 0) return null;
  const imageUrl = String(item.imageUrl || item.thumbnail || "");
  const images = Array.isArray(item.images) ? item.images.filter((image): image is { url?: string } => Boolean(image && typeof image === "object")) : imageUrl ? [{ url: imageUrl }] : [];
  return {
    productId: String(item.productId || ""),
    variantId,
    handle: String(item.handle || ""),
    title: String(item.title || "dBaronX product"),
    imageUrl,
    thumbnail: String(item.thumbnail || imageUrl),
    images,
    priceMinor: Math.round(priceMinor),
    currencyCode: String(item.currencyCode || "usd").toLowerCase(),
    quantity: Math.max(1, Math.floor(Number(item.quantity || 1))),
    buyable: item.buyable !== false,
    selected: item.selected !== false,
  };
}

export function formatCartPrice(amountMinor: number, currencyCode = "usd") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode.toUpperCase() }).format((amountMinor || 0) / 100);
}
