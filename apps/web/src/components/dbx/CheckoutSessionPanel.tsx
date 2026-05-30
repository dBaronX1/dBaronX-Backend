"use client";

import { useState } from "react";

import { createStripeCheckoutSession } from "@/lib/checkout/stripe";
import { productDisplayPrice, productPrimaryVariantId, type StoreProduct } from "@/lib/store-products";
import { DbxCard, dbxButtonStyle } from "@/components/dbx/DbxVisualShell";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export function CheckoutSessionPanel({ product, requestedVariant }: { product: StoreProduct | null; requestedVariant?: string }) {
  const variantId = requestedVariant || productPrimaryVariantId(product);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function beginCheckout() {
    if (!product || !variantId) {
      setStatus("Please select a buyable product variant before checkout.");
      return;
    }
    if (!email.trim()) {
      setStatus("Please enter an email address for checkout updates.");
      return;
    }
    setSubmitting(true);
    setStatus("Creating secure checkout session…");
    const result = await createStripeCheckoutSession({
      cartId: `rocket_${text(product.handle) || variantId}_${Date.now()}`,
      productId: text(product.productId || product.id),
      variantId,
      quantity: 1,
      priceMinor: numberValue(product.priceMinor),
      currency: text(product.currencyCode || "usd").toLowerCase() || "usd",
      title: text(product.title),
      productHandle: text(product.handle),
      customerEmail: email.trim(),
    });
    const checkoutUrl = text(result?.checkoutUrl || result?.url);
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
      return;
    }
    setSubmitting(false);
    setStatus(text(result?.message) || "Checkout is temporarily unavailable. Please try again shortly or contact support.");
  }

  if (!product) {
    return (
      <DbxCard>
        <h2 style={{ marginTop: 0 }}>Checkout unavailable</h2>
        <p style={{ color: "#fed7aa", lineHeight: 1.7 }}>This product could not be loaded from the NestJS catalog. Please return to products and try again.</p>
      </DbxCard>
    );
  }

  return (
    <DbxCard>
      <h2 style={{ marginTop: 0 }}>Secure checkout</h2>
      <p style={{ color: "#fed7aa", lineHeight: 1.7 }}>{product.title}</p>
      <p style={{ color: "#fdba74" }}>Variant: <code>{variantId || "Unavailable"}</code></p>
      <p style={{ color: "#fdba74" }}>Price: {productDisplayPrice(product)}</p>
      <label htmlFor="dbx-checkout-email" style={{ color: "#fed7aa", fontWeight: 800 }}>Email</label>
      <input
        id="dbx-checkout-email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        style={{ display: "block", width: "100%", margin: "8px 0 14px", border: "1px solid rgba(255,255,255,.16)", borderRadius: 16, background: "rgba(255,255,255,.08)", color: "#fff7ed", padding: "12px 14px", fontWeight: 800 }}
      />
      <button type="button" disabled={submitting || !variantId} onClick={beginCheckout} style={{ ...dbxButtonStyle, cursor: submitting || !variantId ? "not-allowed" : "pointer" }}>
        {submitting ? "Creating checkout…" : "Continue to Stripe"}
      </button>
      {status ? <p role="status" style={{ color: "#fed7aa", lineHeight: 1.6 }}>{status}</p> : null}
      <p style={{ color: "#fdba74", lineHeight: 1.6 }}>Payment is only confirmed by the signed backend Stripe webhook after checkout.</p>
    </DbxCard>
  );
}
