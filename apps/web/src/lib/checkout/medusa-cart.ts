import { createStripeCheckoutSession } from "@/lib/checkout/stripe";

type StoreCartResult = {
  configured: boolean;
  success?: boolean;
  cart?: unknown;
  cartId?: string;
  subtotal?: number;
  lineItemCount?: number;
  message: string;
};

export async function createMedusaCart(input: { regionId?: string; email?: string } = {}): Promise<StoreCartResult> {
  return {
    configured: true,
    success: true,
    cart: { email: input.email || null, regionId: input.regionId || null, source: "nestjs_checkout_gateway" },
    cartId: `api_cart_${Date.now()}`,
    subtotal: 0,
    lineItemCount: 0,
    message: "Cart identity created for NestJS checkout gateway.",
  };
}

export async function addMedusaCartLineItem(input: { cartId: string; variantId: string; quantity?: number; priceMinor?: number; productId?: string; email?: string }): Promise<StoreCartResult> {
  if (!input.cartId || !input.variantId) {
    return { configured: true, success: false, message: "Checkout requires a normalized product variant from the API catalog." };
  }
  return {
    configured: true,
    success: true,
    cart: { id: input.cartId, variantId: input.variantId, quantity: Math.max(1, Number(input.quantity || 1)), source: "nestjs_checkout_gateway" },
    cartId: input.cartId,
    subtotal: Number(input.priceMinor || 0) * Math.max(1, Number(input.quantity || 1)),
    lineItemCount: 1,
    message: "Line item normalized for NestJS checkout gateway.",
  };
}

export async function createCartWithLineItem(input: { variantId: string; quantity?: number; regionId?: string; email?: string; priceMinor?: number; productId?: string }) {
  const cartResult = await createMedusaCart({ regionId: input.regionId, email: input.email });
  if (!cartResult.success || !cartResult.cartId) return cartResult;
  return addMedusaCartLineItem({ cartId: cartResult.cartId, variantId: input.variantId, quantity: input.quantity, priceMinor: input.priceMinor, productId: input.productId, email: input.email });
}

export async function createCheckoutForLineItem(input: Parameters<typeof createStripeCheckoutSession>[0]) {
  return createStripeCheckoutSession(input);
}
