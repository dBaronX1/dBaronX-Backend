"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { DbxCard, dbxButtonStyle } from "@/components/dbx/DbxVisualShell";
import { productDisplayPrice, productPrimaryImage, type StoreProduct } from "@/lib/store-products";
import { createStripeCheckoutSession } from "@/lib/checkout/stripe";
import { cartItemFromProduct, formatCartPrice, readLocalCart, type DbxLocalCartItem } from "@/lib/cart/dbx-local-cart";

type Props = {
  product?: StoreProduct | null;
  variantId?: string;
};

type PaymentProvider = "stripe" | "paystack";

const safeCheckoutMessage = "Checkout is temporarily unavailable. Please try again.";

export function StripeCheckoutPanel({ product, variantId = "" }: Props) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("United States");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>("stripe");
  const [items, setItems] = useState<DbxLocalCartItem[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const selected = readLocalCart().filter((item) => item.selected && item.buyable);
    if (selected.length) {
      setItems(selected);
      return;
    }
    if (product) setItems([cartItemFromProduct(product, variantId)]);
  }, [product, variantId]);

  const total = useMemo(() => items.reduce((sum, item) => sum + item.priceMinor * item.quantity, 0), [items]);
  const primaryItem = items[0] || null;
  const checkoutVariantId = variantId || primaryItem?.variantId || "";
  const currencyCode = primaryItem?.currencyCode || String(product?.currencyCode || "usd").toLowerCase();
  const productLabel = product?.title || product?.handle || primaryItem?.title || "Selected dBaronX items";
  const shippingReady = Boolean(email && fullName && country && city && addressLine1 && postalCode);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!items.length) {
      setStatus("Select at least one item to checkout.");
      return;
    }
    if (!shippingReady) {
      setStatus("Please complete your shipping details before checkout.");
      return;
    }
    setLoading(true);
    setStatus("Creating secure checkout session…");
    const result = await createStripeCheckoutSession({
      cartId: `dbx_${product?.handle || product?.id || primaryItem?.handle || checkoutVariantId}_${Date.now()}`,
      productId: String(product?.productId || product?.id || primaryItem?.productId || ""),
      variantId: checkoutVariantId,
      priceMinor: total,
      quantity: Math.max(1, items.reduce((sum, item) => sum + item.quantity, 0)),
      currency: currencyCode,
      handle: String(product?.handle || primaryItem?.handle || ""),
      productName: String(product?.title || primaryItem?.title || "dBaronX product"),
      imageUrl: product ? productPrimaryImage(product) : primaryItem?.imageUrl || "",
      lineItems: items.map((item) => ({ productId: item.productId, variantId: item.variantId, handle: item.handle, title: item.title, quantity: item.quantity, unitPriceMinor: item.priceMinor, currencyCode: item.currencyCode })),
      totalMinor: total,
      paymentProvider,
      customerEmail: email,
      fullName,
      phone,
      country,
      city,
      addressLine1,
      postalCode,
      ...(product?.supplier ? { supplier: String(product.supplier) } : {}),
      ...(product?.supplierProductId ? { supplierProductId: String(product.supplierProductId) } : {}),
      ...(product?.supplierSku ? { supplierSku: String(product.supplierSku) } : {}),
    });
    setLoading(false);
    if (result?.checkoutUrl) {
      window.location.href = result.checkoutUrl;
      return;
    }
    setStatus(result?.message && !/stripe|paystack|api|internal|database|webhook|secret|token/i.test(result.message) ? result.message : safeCheckoutMessage);
  }

  if (!items.length) {
    return <DbxCard><h2 style={{ marginTop: 0 }}>Select items first</h2><p style={{ color: "#fed7aa" }}>Select at least one item to checkout.</p><Link href="/cart" style={dbxButtonStyle}>Open cart</Link></DbxCard>;
  }

  return (
    <DbxCard>
      <h2 style={{ marginTop: 0 }}>Secure checkout</h2>
      <p style={{ color: "#fed7aa", lineHeight: 1.7 }}>
Your product, contact, and shipping details are sent securely so hosted payment can begin. Payment status updates only after verified payment confirmation.
      </p>
      <p style={{ color: "#fdba74", wordBreak: "break-word" }}>Product: {productLabel}</p>
      <p style={{ color: "#fff7ed", fontWeight: 950 }}>{product ? productDisplayPrice(product) : formatCartPrice(total, currencyCode)}</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <label style={labelStyle}>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} style={fieldStyle} /></label>
        <label style={labelStyle}>Full name<input required value={fullName} onChange={(event) => setFullName(event.target.value)} style={fieldStyle} /></label>
        <label style={labelStyle}>Phone<input value={phone} onChange={(event) => setPhone(event.target.value)} style={fieldStyle} /></label>
        <label style={labelStyle}>Country<input required value={country} onChange={(event) => setCountry(event.target.value)} style={fieldStyle} /></label>
        <label style={labelStyle}>State / region<input value={state} onChange={(event) => setState(event.target.value)} style={fieldStyle} /></label>
        <label style={labelStyle}>City<input required value={city} onChange={(event) => setCity(event.target.value)} style={fieldStyle} /></label>
        <label style={labelStyle}>Address line 1<input required value={addressLine1} onChange={(event) => setAddressLine1(event.target.value)} style={fieldStyle} /></label>
        <label style={labelStyle}>Address line 2<input value={addressLine2} onChange={(event) => setAddressLine2(event.target.value)} style={fieldStyle} /></label>
        <label style={labelStyle}>Postal code<input required value={postalCode} onChange={(event) => setPostalCode(event.target.value)} style={fieldStyle} /></label>
        <button type="submit" disabled={loading || !checkoutVariantId || !total} style={{ ...dbxButtonStyle, border: 0, cursor: loading ? "wait" : "pointer", opacity: loading || !checkoutVariantId || !total ? 0.7 : 1 }}>{loading ? "Starting checkout…" : "Start secure payment"}</button>
      </form>
      {status ? <p role="status" style={{ color: status.includes("temporarily") || status.includes("Select") || status.includes("complete") ? "#fecaca" : "#fed7aa", lineHeight: 1.6 }}>{status}</p> : null}
      <Link href="/cart" style={{ color: "#fbbf24", fontWeight: 900 }}>Back to cart</Link>
    </DbxCard>
  );
}

const labelStyle = { display: "grid", gap: 8, color: "#fed7aa", fontWeight: 800 } as const;
const fieldStyle = { border: "1px solid rgba(255,255,255,.16)", borderRadius: 16, background: "rgba(255,255,255,.08)", color: "#fff7ed", padding: "12px 14px", fontWeight: 800, width: "100%" } as const;
