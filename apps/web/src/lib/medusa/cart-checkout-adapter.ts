const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

function headers() {
  return { "content-type": "application/json", "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY || "" };
}

export async function createMedusaCart(regionId: string) {
  if (!MEDUSA_BACKEND_URL || !MEDUSA_PUBLISHABLE_KEY) return { configured: false, message: "checkout not fully configured" };
  const r = await fetch(`${MEDUSA_BACKEND_URL.replace(/\/$/, "")}/store/carts`, { method: "POST", headers: headers(), body: JSON.stringify({ region_id: regionId }) });
  if (!r.ok) return { configured: true, success: false, message: "checkout not fully configured" };
  return { configured: true, success: true, cart: await r.json() };
}

export async function addItemToMedusaCart(cartId: string, variantId: string, quantity = 1) {
  if (!MEDUSA_BACKEND_URL || !MEDUSA_PUBLISHABLE_KEY) return { configured: false, message: "checkout not fully configured" };
  const r = await fetch(`${MEDUSA_BACKEND_URL.replace(/\/$/, "")}/store/carts/${encodeURIComponent(cartId)}/line-items`, { method: "POST", headers: headers(), body: JSON.stringify({ variant_id: variantId, quantity }) });
  return r.ok ? { configured: true, success: true, cart: await r.json() } : { configured: true, success: false, message: "checkout not fully configured" };
}

export function buildCheckoutSessionHandoff(cartId: string) { return { cartId, status: "pending_provider" as const, message: "checkout not fully configured" }; }
export function buildNestPaymentIntentHandoff(cartId: string) { return { cartId, endpoint: "/api/checkout/dbx/intent", status: "requires_nest_payment_provider" as const }; }
