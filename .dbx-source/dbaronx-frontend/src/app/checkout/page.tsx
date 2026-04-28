"use client";
import React, { Suspense, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createManualCheckout, type CheckoutItem } from "@/lib/api";

function CheckoutForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successOrder, setSuccessOrder] = useState<null | {
    id: string;
    public_reference: string;
    customer_name: string;
    total_amount: number;
    currency: string;
    payment_status: string;
  }>(null);

  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    country: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    postal_code: "",
    currency: "USD",
    product_id: searchParams?.get("product_id") || "",
    product_name: searchParams?.get("product_name") || "",
    product_handle: searchParams?.get("product_handle") || "",
    quantity: Number(searchParams?.get("quantity") || 1),
    unit_price: Number(searchParams?.get("unit_price") || 0),
  });

  const totalAmount = useMemo(() => Number(form.quantity) * Number(form.unit_price), [form.quantity, form.unit_price]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessOrder(null);
    try {
      const items: CheckoutItem[] = [{
        product_id: form.product_id || undefined,
        product_name: form.product_name,
        product_handle: form.product_handle || undefined,
        quantity: Number(form.quantity),
        unit_price: Number(form.unit_price),
      }];
      const result = await createManualCheckout({
        customer_name: form.customer_name,
        customer_email: form.customer_email || undefined,
        customer_phone: form.customer_phone || undefined,
        country: form.country,
        address_line_1: form.address_line_1,
        address_line_2: form.address_line_2 || undefined,
        city: form.city || undefined,
        postal_code: form.postal_code || undefined,
        currency: form.currency,
        total_amount: totalAmount,
        items,
        source: "website",
      });
      setSuccessOrder(result.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (successOrder) {
    return (
      <div className="bg-[#0D0D2B] border border-[rgba(34,197,94,0.3)] rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#22C55E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Order Created Successfully</h1>
        <p className="text-[#9090BB] text-sm mb-6">Your order has been received. Keep your reference safe.</p>

        <div className="bg-[rgba(94,23,235,0.08)] border border-[rgba(94,23,235,0.25)] rounded-xl p-5 mb-6 text-left">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[#9090BB]">Reference</span>
              <span className="font-mono font-bold text-[#00F0FF]">{successOrder.public_reference}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9090BB]">Customer</span>
              <span className="text-white">{successOrder.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9090BB]">Amount</span>
              <span className="text-white font-semibold">{successOrder.total_amount} {successOrder.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#9090BB]">Status</span>
              <span className="text-[#F59E0B] font-medium capitalize">{successOrder.payment_status}</span>
            </div>
          </div>
        </div>

        <div className="bg-[rgba(0,240,255,0.04)] border border-[rgba(0,240,255,0.15)] rounded-xl p-4 mb-6 text-left">
          <p className="text-xs font-semibold text-[#00F0FF] mb-2">📋 Next Step</p>
          <p className="text-xs text-[#9090BB] leading-relaxed">
            Please keep this reference: <span className="font-mono text-white">{successOrder.public_reference}</span>.
            Send your payment using your chosen method, then submit your payment proof to confirm your order.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={`/payment-proof?reference=${encodeURIComponent(successOrder.public_reference)}`}
            className="flex-1 btn-glow-purple bg-[#5E17EB] hover:bg-[#7B3FF5] text-white py-3 rounded-full font-bold text-sm text-center transition-all"
          >
            Submit Payment Proof →
          </Link>
          <Link
            href={`/order-status?reference=${encodeURIComponent(successOrder.public_reference)}`}
            className="flex-1 bg-transparent border border-[rgba(94,23,235,0.3)] text-[#9090BB] hover:text-white py-3 rounded-full font-semibold text-sm text-center transition-all"
          >
            Track Order
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl p-6">
        <h2 className="text-base font-bold text-white mb-4">Customer Details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <input className="bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors" placeholder="Full name *" value={form.customer_name} onChange={(e) => update("customer_name", e.target.value)} required />
          <input className="bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors" placeholder="Email address" type="email" value={form.customer_email} onChange={(e) => update("customer_email", e.target.value)} />
          <input className="bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors" placeholder="Phone number" value={form.customer_phone} onChange={(e) => update("customer_phone", e.target.value)} />
          <input className="bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors" placeholder="Country *" value={form.country} onChange={(e) => update("country", e.target.value)} required />
          <input className="bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors md:col-span-2" placeholder="Address line 1 *" value={form.address_line_1} onChange={(e) => update("address_line_1", e.target.value)} required />
          <input className="bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors md:col-span-2" placeholder="Address line 2 (optional)" value={form.address_line_2} onChange={(e) => update("address_line_2", e.target.value)} />
          <input className="bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors" placeholder="City" value={form.city} onChange={(e) => update("city", e.target.value)} />
          <input className="bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors" placeholder="Postal code" value={form.postal_code} onChange={(e) => update("postal_code", e.target.value)} />
        </div>
      </div>

      <div className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl p-6">
        <h2 className="text-base font-bold text-white mb-4">Order Summary</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <input className="bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors md:col-span-2" placeholder="Product name *" value={form.product_name} onChange={(e) => update("product_name", e.target.value)} required />
          <div className="flex items-center gap-3">
            <label className="text-xs text-[#9090BB] whitespace-nowrap">Qty</label>
            <input className="bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors w-full" type="number" min={1} value={form.quantity} onChange={(e) => update("quantity", Number(e.target.value))} required />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-[#9090BB] whitespace-nowrap">Unit Price</label>
            <input className="bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors w-full" type="number" min={0} step="0.01" value={form.unit_price} onChange={(e) => update("unit_price", Number(e.target.value))} required />
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-[rgba(94,23,235,0.15)] flex justify-between items-center">
          <span className="text-[#9090BB] text-sm">Total Amount</span>
          <span className="text-xl font-bold text-white">${totalAmount.toFixed(2)} {form.currency}</span>
        </div>
      </div>

      <div className="bg-[rgba(94,23,235,0.04)] border border-[rgba(94,23,235,0.15)] rounded-2xl p-5">
        <p className="text-xs font-semibold text-[#C084FC] mb-3">Accepted Payment Methods</p>
        <div className="flex flex-wrap gap-2">
          {["Bank Transfer", "Mobile Money", "Crypto / USDT", "Paystack", "Stripe", "Manual Transfer"].map((m) => (
            <span key={m} className="text-xs text-[#9090BB] bg-[rgba(94,23,235,0.08)] border border-[rgba(94,23,235,0.15)] px-3 py-1 rounded-full">{m}</span>
          ))}
        </div>
        <p className="text-xs text-[#9090BB] mt-3">After placing your order, you'll receive a reference number and instructions to complete payment.</p>
      </div>

      {error && (
        <div className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <button type="submit" disabled={loading} className="w-full btn-glow-purple bg-[#5E17EB] hover:bg-[#7B3FF5] text-white py-4 rounded-full font-bold text-sm uppercase tracking-wider transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
        {loading ? (<><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Creating Order...</>) : "Place Order →"}
      </button>
    </form>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-[#050510] circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        <div className="max-w-3xl mx-auto px-4">
          <div className="mb-8">
            <span className="tag-badge">Secure Checkout</span>
            <h1 className="text-3xl font-extrabold text-white mt-3 mb-2">Complete Your Order</h1>
            <p className="text-[#9090BB] text-sm">Fill in your details and receive your payment reference instantly.</p>
          </div>
          <Suspense fallback={<div className="text-[#9090BB] text-sm">Loading checkout...</div>}>
            <CheckoutForm />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
