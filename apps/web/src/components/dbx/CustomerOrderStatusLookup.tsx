"use client";

import { FormEvent, useState } from "react";

import { DbxCard, dbxButtonStyle } from "@/components/dbx/DbxVisualShell";

type OrderStatusPayload = {
  success?: boolean;
  status?: string;
  orderReference?: string;
  message?: string;
};

function safeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() || fallback : fallback;
}

function customerStatusLabel(status: string) {
  const normalized = status.toLowerCase();
  if (["paid", "paid_verified", "payment_verified"].includes(normalized)) return "Payment confirmed";
  if (["fulfilled", "completed", "delivered"].includes(normalized)) return "Order completed";
  if (["failed", "cancelled", "canceled"].includes(normalized)) return "Order could not be completed";
  if (["pending", "created", "processing"].includes(normalized)) return "Order is processing";
  return "Order status loaded";
}

export function CustomerOrderStatusLookup() {
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrderStatusPayload | null>(null);
  const [message, setMessage] = useState("");

  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const orderReference = reference.trim();
    if (!orderReference) {
      setMessage("Enter your order or checkout reference.");
      setResult(null);
      return;
    }
    setLoading(true);
    setMessage("Checking order status…");
    setResult(null);
    try {
      const response = await fetch(`/api/order-status?reference=${encodeURIComponent(orderReference)}`, {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as OrderStatusPayload | null;
      const status = safeText(payload?.status, "pending");
      setResult({
        success: payload?.success === true,
        status,
        orderReference: safeText(payload?.orderReference, orderReference),
        message: safeText(payload?.message, "Order status loaded."),
      });
      setMessage(customerStatusLabel(status));
    } catch {
      setMessage("Order status is temporarily unavailable. Please contact support with your order reference.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DbxCard>
      <h2 style={{ marginTop: 0 }}>Find your order</h2>
      <p style={{ color: "#fed7aa", lineHeight: 1.7 }}>
        Enter the order or checkout reference from your confirmation page or email. Payment status is shown only after verified confirmation.
      </p>
      <form onSubmit={lookup} style={{ display: "grid", gap: 12 }}>
        <label style={labelStyle}>
          Order or checkout reference
          <input value={reference} onChange={(event) => setReference(event.target.value)} style={fieldStyle} autoComplete="off" />
        </label>
        <button type="submit" disabled={loading} style={{ ...dbxButtonStyle, border: 0, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Checking…" : "Check order status"}
        </button>
      </form>
      {message ? <p role="status" style={{ color: "#fed7aa", lineHeight: 1.6 }}>{message}</p> : null}
      {result ? (
        <div style={{ marginTop: 12, display: "grid", gap: 6, color: "#fff7ed" }}>
          <strong>{customerStatusLabel(result.status || "pending")}</strong>
          <span>Reference: {result.orderReference}</span>
          <span>{result.message}</span>
        </div>
      ) : null}
    </DbxCard>
  );
}

const labelStyle = { display: "grid", gap: 8, color: "#fed7aa", fontWeight: 800 } as const;
const fieldStyle = { border: "1px solid rgba(255,255,255,.16)", borderRadius: 16, background: "rgba(255,255,255,.08)", color: "#fff7ed", padding: "12px 14px", fontWeight: 800, width: "100%" } as const;
