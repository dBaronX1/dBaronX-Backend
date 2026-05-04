export async function createStripeCheckoutSession(input: { cartId: string; amount: number; currency?: string; userId?: string }) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NESTJS_API_URL;
  if (!base || !process.env.STRIPE_PUBLIC_KEY) return { configured: false, message: "checkout not configured" };
  const response = await fetch(`${base.replace(/\/$/, "")}/v1/checkout/stripe/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      ...input,
      currency: input.currency || "usd",
      successUrl: "https://dbaronx.com/checkout/success",
      cancelUrl: "https://dbaronx.com/checkout/cancel",
    }),
  });
  return response.json();
}
