import { getPublicEnv } from "@/lib/env";

type StripeCheckoutSessionInput = {
  cartId: string;
  variantId?: string;
  quantity?: number;
  amount?: number;
  priceMinor?: number;
  productId?: string;
  productHandle?: string;
  title?: string;
  customerEmail?: string;
  currency?: string;
  orderIntentId?: string;
  orderRef?: string;
  customerRef?: string;
  successUrl?: string;
  cancelUrl?: string;
};

export async function createStripeCheckoutSession(input: StripeCheckoutSessionInput) {
  const env = getPublicEnv();
  const base = env.apiBaseUrl;
  const webBase = env.webBaseUrl || env.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");

  if (!base || !env.stripePublicKey) {
    return {
      configured: false,
      checkoutUrl: null,
      sessionId: null,
      message: "Checkout is temporarily unavailable. Please try again shortly or contact support.",
    };
  }

  const response = await fetch(`${base}/api/checkout/stripe/session`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      ...input,
      currency: input.currency || "usd",
      successUrl: input.successUrl || `${webBase}/checkout/success`,
      cancelUrl: input.cancelUrl || `${webBase}/checkout/cancel`,
    }),
  });

  if (!response.ok) {
    return {
      configured: true,
      checkoutUrl: null,
      sessionId: null,
      message: "Checkout is temporarily unavailable. Please try again shortly or contact support.",
    };
  }
  return response.json();
}
