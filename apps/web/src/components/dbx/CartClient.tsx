"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { DbxCard, dbxButtonStyle } from "@/components/dbx/DbxVisualShell";
import { cartItemFromProduct, formatCartPrice, readLocalCart, writeLocalCart, type DbxLocalCartItem } from "@/lib/cart/dbx-local-cart";
import { type StoreProduct } from "@/lib/store-products";

export function CartClient({ initialItem }: { initialItem?: StoreProduct | null }) {
  const [items, setItems] = useState<DbxLocalCartItem[]>([]);

  useEffect(() => {
    const existing = readLocalCart();
    const incoming = initialItem ? cartItemFromProduct(initialItem) : null;
    const next = incoming && incoming.buyable && !existing.some((item) => item.variantId === incoming.variantId)
      ? [...existing, incoming]
      : existing.map((item) => incoming && item.variantId === incoming.variantId ? { ...item, selected: true } : item);
    setItems(next);
    writeLocalCart(next);
  }, [initialItem]);

  function update(next: DbxLocalCartItem[]) {
    setItems(next);
    writeLocalCart(next);
  }

  const totals = useMemo(() => {
    const cartSubtotal = items.reduce((sum, item) => sum + item.priceMinor * item.quantity, 0);
    const selected = items.filter((item) => item.selected && item.buyable);
    const selectedSubtotal = selected.reduce((sum, item) => sum + item.priceMinor * item.quantity, 0);
    return { cartSubtotal, selectedSubtotal, selectedCount: selected.length, currencyCode: selected[0]?.currencyCode || items[0]?.currencyCode || "usd" };
  }, [items]);

  const allSelected = items.length > 0 && items.every((item) => item.selected);

  if (!items.length) {
    return <DbxCard><h2 style={{ marginTop: 0 }}>Your cart is empty</h2><p style={{ color: "#fed7aa" }}>Add products from the shop to review selected items before secure checkout.</p><Link href="/shop" style={dbxButtonStyle}>Browse products</Link></DbxCard>;
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <DbxCard>
        <h2 style={{ marginTop: 0 }}>Cart items</h2>
        <label style={{ display: "flex", gap: 10, alignItems: "center", color: "#fed7aa", fontWeight: 900 }}>
          <input type="checkbox" checked={allSelected} onChange={(event) => update(items.map((item) => ({ ...item, selected: event.target.checked })))} />
          Select all
        </label>
        <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
          {items.map((item) => (
            <div key={item.variantId} style={{ display: "grid", gridTemplateColumns: "auto 92px minmax(0,1fr)", gap: 14, alignItems: "center", borderTop: "1px solid rgba(255,255,255,.12)", paddingTop: 14 }}>
              <input aria-label={`Select ${item.title}`} type="checkbox" checked={item.selected} onChange={(event) => update(items.map((cartItem) => cartItem.variantId === item.variantId ? { ...cartItem, selected: event.target.checked } : cartItem))} />
              <div style={{ position: "relative", width: 92, height: 92, borderRadius: 16, overflow: "hidden", background: "rgba(255,255,255,.08)" }}>
                {item.imageUrl ? <Image src={item.imageUrl} alt={item.title} fill sizes="92px" quality={92} style={{ objectFit: "cover" }} unoptimized={item.imageUrl.startsWith("http")} /> : null}
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <strong>{item.title}</strong>
                <span style={{ color: "#fed7aa" }}>Unit price: {formatCartPrice(item.priceMinor, item.currencyCode)}</span>
                <label style={{ color: "#fed7aa" }}>Quantity <input type="number" min={1} value={item.quantity} onChange={(event) => update(items.map((cartItem) => cartItem.variantId === item.variantId ? { ...cartItem, quantity: Math.max(1, Number(event.target.value) || 1) } : cartItem))} style={{ width: 84, marginLeft: 8 }} /></label>
                <span style={{ color: "#fff7ed", fontWeight: 900 }}>Line total: {formatCartPrice(item.priceMinor * item.quantity, item.currencyCode)}</span>
                <button type="button" onClick={() => update(items.filter((cartItem) => cartItem.variantId !== item.variantId))} style={{ ...dbxButtonStyle, border: 0, cursor: "pointer", width: "fit-content", background: "rgba(255,255,255,.08)" }}>Remove item</button>
              </div>
            </div>
          ))}
        </div>
      </DbxCard>
      <DbxCard>
        <h2 style={{ marginTop: 0 }}>Checkout summary</h2>
        <p style={{ color: "#fed7aa" }}>Cart subtotal: {formatCartPrice(totals.cartSubtotal, totals.currencyCode)}</p>
        <p style={{ color: "#fff7ed", fontWeight: 950 }}>Selected subtotal: {formatCartPrice(totals.selectedSubtotal, totals.currencyCode)}</p>
        <p style={{ color: "#fed7aa" }}>Selected count: {totals.selectedCount}</p>
        {totals.selectedCount === 0 ? <p role="status" style={{ color: "#fecaca" }}>Select at least one item to checkout.</p> : null}
        <Link href="/checkout" aria-disabled={totals.selectedCount === 0} style={{ ...dbxButtonStyle, opacity: totals.selectedCount === 0 ? 0.55 : 1, pointerEvents: totals.selectedCount === 0 ? "none" : "auto" }}>Checkout selected items</Link>
      </DbxCard>
    </div>
  );
}
