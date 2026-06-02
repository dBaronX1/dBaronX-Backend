import { getPublicEnv } from "@/lib/env";

type CheckoutLineItemInput = { productId?: string; variantId: string; handle?: string; title?: string; quantity: number; unitPriceMinor: number; currencyCode?: string };
type CheckoutCustomerInput = { email: string; fullName?: string; phone?: string };
type CheckoutShippingAddressInput = { country: string; city: string; state?: string; addressLine1: string; addressLine2?: string; postalCode: string };

type StripeCheckoutSessionInput = {
  cartId: string;
  productId?: string;
  variantId?: string;
  quantity?: number;
  amount?: number;
  priceMinor?: number;
  unitPriceMinor?: number;
  currency?: string;
  orderIntentId?: string;
  orderRef?: string;
  checkoutRef?: string;
  customerRef?: string;
  customerEmail?: string;
  email?: string;
  fullName?: string;
  customerName?: string;
  phone?: string;
  country?: string;
  city?: string;
  addressLine1?: string;
  postalCode?: string;
  handle?: string;
  productName?: string;
  imageUrl?: string;
  supplier?: string;
  supplierProductId?: string;
  supplierSku?: string;
  successUrl?: string;
  cancelUrl?: string;
  customer?: CheckoutCustomerInput;
  shippingAddress?: CheckoutShippingAddressInput;
  lineItems?: CheckoutLineItemInput[];
  totalMinor?: number;
  paymentProvider?: "stripe" | "paystack";
  provider?: "stripe" | "paystack";
  paymentMethod?: "stripe" | "paystack";
  payment_method?: "stripe" | "paystack";
  selectedPaymentMethod?: "stripe" | "paystack";
  source?: string;
};

export async function createStripeCheckoutSession(input: StripeCheckoutSessionInput) {
  const env = getPublicEnv();
  const base = env.apiBaseUrl;
  const webBase = env.webBaseUrl || env.siteUrl || (typeof window !== "undefined" ? window.location.origin : "");

  if (!base) {
    return {
      configured: false,
      checkoutUrl: null,
      sessionId: null,
      blockers: ["api_base_url_missing"],
      message: "Checkout is temporarily unavailable. Please try again.",
    };
  }

  const response = await fetch(`${base}/api/checkout/session`, {
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
      message: "Checkout is temporarily unavailable. Please try again.",
    };
  }
  return response.json();
}
