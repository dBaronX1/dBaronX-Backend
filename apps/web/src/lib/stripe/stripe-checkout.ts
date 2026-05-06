type StripeCheckoutSessionInput = {
  cartId: string;
  amount: number;
  currency?: string;
  userId?: string;
  orderIntentId?: string;
  supplierRefs?: string[];
  successUrl?: string;
  cancelUrl?: string;
};

export async function createStripeCheckoutSession(input: StripeCheckoutSessionInput) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NESTJS_API_URL;
  const publicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY;

  if (!base || !publicKey) {
    return {
      configured: false,
      checkoutUrl: null,
      sessionId: null,
      blockers: [!base ? "api_base_url_missing" : null, !publicKey ? "stripe_public_key_missing" : null].filter(Boolean),
      message: "Stripe checkout is not configured for the browser.",
    };
  }

  const webBase = process.env.NEXT_PUBLIC_WEB_BASE_URL || "https://dbaronx.com";
  const response = await fetch(`${base.replace(/\/$/, "")}/api/v1/checkout/stripe/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...input,
      currency: input.currency || "usd",
      successUrl: input.successUrl || `${webBase.replace(/\/$/, "")}/checkout/success`,
      cancelUrl: input.cancelUrl || `${webBase.replace(/\/$/, "")}/checkout/cancel`,
    }),
  });

  return response.json();
}
