import { createStripeCheckoutSession } from "@/lib/checkout/stripe";

export async function createMedusaCart(regionId: string) {
  return { configured: true, cart: { id: `api_cart_${Date.now()}`, regionId, source: "nestjs_checkout_gateway" }, message: "Cart identity created for NestJS checkout gateway." };
}

export async function addLineItem(cartId: string, variantId: string, quantity = 1) {
  return { configured: true, cart: { id: cartId, variantId, quantity, source: "nestjs_checkout_gateway" }, message: "Line item normalized for NestJS checkout gateway." };
}

export async function createCheckout(input: Parameters<typeof createStripeCheckoutSession>[0]) {
  return createStripeCheckoutSession(input);
}
