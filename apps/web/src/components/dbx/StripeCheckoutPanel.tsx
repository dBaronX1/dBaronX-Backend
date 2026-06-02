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
  const currencyCode = items[0]?.currencyCode || String(product?.currencyCode || "usd").toLowerCase();
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
      cartId: `web_${Date.now()}`,
      customer: { email, fullName, phone },
      shippingAddress: { country, city, state, addressLine1, addressLine2, postalCode },
      lineItems: items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        handle: item.handle,
        title: item.title,
        quantity: item.quantity,
        unitPriceMinor: item.priceMinor,
        currencyCode: item.currencyCode,
      })),
      totalMinor: total,
      paymentProvider,
      source: "web",
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
      <p style={{ color: "#fed7aa", lineHeight: 1.7 }}>Review your selected items, add shipping details, then continue to hosted secure checkout. Payment is verified only after secure payment confirmation.</p>
      <div style={{ display: "grid", gap: 12, marginBottom: 18 }}>
        {items.map((item) => (
          <div key={item.variantId} style={{ display: "grid", gridTemplateColumns: "78px minmax(0,1fr)", gap: 12, alignItems: "center" }}>
            <div style={{ position: "relative", width: 78, height: 78, borderRadius: 14, overflow: "hidden", background: "rgba(255,255,255,.08)" }}>
              {item.imageUrl ? <Image src={item.imageUrl} alt={item.title} fill sizes="78px" quality={92} style={{ objectFit: "cover" }} unoptimized={item.imageUrl.startsWith("http")} /> : null}
            </div>
            <p style={{ margin: 0, color: "#fed7aa" }}>{item.title} × {item.quantity}<br /><strong style={{ color: "#fff7ed" }}>{formatCartPrice(item.priceMinor * item.quantity, item.currencyCode)}</strong></p>
          </div>
        ))}
      </div>
      {product && !items.length ? <p style={{ color: "#fff7ed", fontWeight: 950 }}>{productDisplayPrice(product)}</p> : null}
      <p style={{ color: "#fff7ed", fontWeight: 950 }}>Selected subtotal: {formatCartPrice(total, currencyCode)}</p>
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
        <label style={labelStyle}>Payment method<select value={paymentProvider} onChange={(event) => setPaymentProvider(event.target.value as PaymentProvider)} style={fieldStyle}><option value="stripe">Card Payment</option><option value="paystack">Mobile Money / Local Payment</option></select></label>
        <button type="submit" disabled={loading || !items.length || !shippingReady} style={{ ...dbxButtonStyle, border: 0, cursor: loading ? "wait" : "pointer", opacity: loading || !items.length || !shippingReady ? 0.7 : 1 }}>{loading ? "Starting checkout…" : "Continue to Secure Checkout"}</button>
      </form>
      {status ? <p role="status" style={{ color: status.includes("temporarily") || status.includes("Select") || status.includes("complete") ? "#fecaca" : "#fed7aa", lineHeight: 1.6 }}>{status}</p> : null}
      <Link href="/cart" style={{ color: "#fbbf24", fontWeight: 900 }}>Back to cart</Link>
    </DbxCard>
  );
}

const labelStyle = { display: "grid", gap: 8, color: "#fed7aa", fontWeight: 800 } as const;
const fieldStyle = { border: "1px solid rgba(255,255,255,.16)", borderRadius: 16, background: "rgba(255,255,255,.08)", color: "#fff7ed", padding: "12px 14px", fontWeight: 800, width: "100%" } as const;
