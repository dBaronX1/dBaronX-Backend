import { getPublicEnv } from "@/lib/env";

type StoreCartResult = {
  configured: boolean;
  success?: boolean;
  cart?: unknown;
  cartId?: string;
  subtotal?: number;
  lineItemCount?: number;
  message: string;
};

function storeConfig() {
  const env = getPublicEnv();
  return {
    backendUrl: env.medusaBackendUrl,
    publishableKey: env.medusaPublishableKey,
  };
}

function storeHeaders(publishableKey: string) {
  return {
    accept: "application/json",
    "content-type": "application/json",
    "x-publishable-api-key": publishableKey,
  };
}

function extractCart(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  return root.cart && typeof root.cart === "object" ? root.cart : root;
}

function extractCartId(cart: unknown) {
  return cart && typeof cart === "object" && typeof (cart as Record<string, unknown>).id === "string" ? String((cart as Record<string, unknown>).id) : "";
}

function extractCartSubtotal(cart: unknown) {
  if (!cart || typeof cart !== "object") return 0;
  const record = cart as Record<string, unknown>;
  return Number(record.subtotal ?? record.item_total ?? record.total ?? 0) || 0;
}

function extractLineItemCount(cart: unknown) {
  if (!cart || typeof cart !== "object") return 0;
  const items = (cart as Record<string, unknown>).items;
  return Array.isArray(items) ? items.length : 0;
}

export async function createMedusaCart(input: { regionId?: string; email?: string } = {}): Promise<StoreCartResult> {
  const { backendUrl, publishableKey } = storeConfig();
  if (!backendUrl || !publishableKey) return { configured: false, success: false, message: "Checkout is temporarily unavailable. Please try again shortly or contact support." };

  const response = await fetch(`${backendUrl}/store/carts`, {
    method: "POST",
    headers: storeHeaders(publishableKey),
    cache: "no-store",
    body: JSON.stringify({ ...(input.regionId ? { region_id: input.regionId } : {}), ...(input.email ? { email: input.email } : {}) }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) return { configured: true, success: false, message: "Checkout is temporarily unavailable. Please try again shortly or contact support." };
  const cart = extractCart(payload);
  return { configured: true, success: true, cart, cartId: extractCartId(cart), subtotal: extractCartSubtotal(cart), lineItemCount: extractLineItemCount(cart), message: "Cart created." };
}

export async function addMedusaCartLineItem(input: { cartId: string; variantId: string; quantity?: number }): Promise<StoreCartResult> {
  const { backendUrl, publishableKey } = storeConfig();
  if (!backendUrl || !publishableKey || !input.cartId || !input.variantId) {
    return { configured: Boolean(backendUrl && publishableKey), success: false, message: "Checkout is temporarily unavailable. Please try again shortly or contact support." };
  }

  const response = await fetch(`${backendUrl}/store/carts/${encodeURIComponent(input.cartId)}/line-items`, {
    method: "POST",
    headers: storeHeaders(publishableKey),
    cache: "no-store",
    body: JSON.stringify({ variant_id: input.variantId, quantity: Math.max(1, Number(input.quantity || 1)) }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) return { configured: true, success: false, message: "Checkout is temporarily unavailable. Please try again shortly or contact support." };
  const cart = extractCart(payload);
  const subtotal = extractCartSubtotal(cart);
  const lineItemCount = extractLineItemCount(cart);
  if (lineItemCount < 1 || subtotal <= 0) {
    return { configured: true, success: false, cart, cartId: extractCartId(cart) || input.cartId, subtotal, lineItemCount, message: "Checkout is temporarily unavailable. Please try again shortly or contact support." };
  }
  return { configured: true, success: true, cart, cartId: extractCartId(cart) || input.cartId, subtotal, lineItemCount, message: "Cart updated." };
}

export async function createCartWithLineItem(input: { variantId: string; quantity?: number; regionId?: string; email?: string }) {
  const cartResult = await createMedusaCart({ regionId: input.regionId, email: input.email });
  if (!cartResult.success || !cartResult.cartId) return cartResult;
  return addMedusaCartLineItem({ cartId: cartResult.cartId, variantId: input.variantId, quantity: input.quantity });
}
