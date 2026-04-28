"use client";
import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { submitPaymentProof } from "@/lib/api";

function PaymentProofForm() {
  const searchParams = useSearchParams();
  const initialReference = searchParams?.get("reference") || "";

  const [form, setForm] = useState({
    public_reference: initialReference,
    provider: "manual_transfer",
    provider_reference: "",
    proof_url: "",
    payer_name: "",
    payer_email: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await submitPaymentProof({
        public_reference: form.public_reference,
        provider: form.provider,
        provider_reference: form.provider_reference || undefined,
        proof_url: form.proof_url || undefined,
        payer_name: form.payer_name || undefined,
        payer_email: form.payer_email || undefined,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit payment proof. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="bg-[#0D0D2B] border border-[rgba(34,197,94,0.3)] rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#22C55E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Payment Proof Submitted</h2>
        <p className="text-[#9090BB] text-sm mb-6">
          Payment proof submitted successfully. We will verify your payment and update your order status.
        </p>
        <div className="bg-[rgba(0,240,255,0.04)] border border-[rgba(0,240,255,0.15)] rounded-xl p-4 mb-6 text-left">
          <p className="text-xs text-[#9090BB]">
            Our team reviews payment proofs within <span className="text-white font-semibold">1–24 hours</span>. 
            You'll receive an update once your payment is confirmed. Track your order status anytime.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={`/order-status?reference=${encodeURIComponent(form.public_reference)}`}
            className="flex-1 btn-glow-purple bg-[#5E17EB] hover:bg-[#7B3FF5] text-white py-3 rounded-full font-bold text-sm text-center transition-all"
          >
            Track Order Status →
          </Link>
          <Link
            href="/products"
            className="flex-1 bg-transparent border border-[rgba(94,23,235,0.3)] text-[#9090BB] hover:text-white py-3 rounded-full font-semibold text-sm text-center transition-all"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Instructions */}
      <div className="bg-[rgba(0,240,255,0.04)] border border-[rgba(0,240,255,0.15)] rounded-xl p-4">
        <p className="text-xs font-semibold text-[#00F0FF] mb-2">📋 Instructions</p>
        <ol className="text-xs text-[#9090BB] space-y-1 list-decimal list-inside">
          <li>Enter your order reference number below</li>
          <li>Select the payment method you used</li>
          <li>Enter your transaction reference or ID</li>
          <li>Optionally add a screenshot URL as proof</li>
          <li>Submit — we'll verify within 1–24 hours</li>
        </ol>
      </div>

      <div className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl p-6 space-y-4">
        <div>
          <label className="text-xs text-[#9090BB] mb-1.5 block">Order Reference *</label>
          <input
            className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors"
            placeholder="e.g. MO-XXXXXXX"
            value={form.public_reference}
            onChange={(e) => update("public_reference", e.target.value)}
            required
          />
        </div>

        <div>
          <label className="text-xs text-[#9090BB] mb-1.5 block">Payment Method *</label>
          <select
            className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors"
            value={form.provider}
            onChange={(e) => update("provider", e.target.value)}
          >
            <option value="manual_transfer">Manual Transfer</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="crypto">Crypto / USDT</option>
            <option value="paystack">Paystack</option>
            <option value="stripe">Stripe</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-[#9090BB] mb-1.5 block">Transaction Reference / ID</label>
          <input
            className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors"
            placeholder="Transaction ID or reference from your bank/app"
            value={form.provider_reference}
            onChange={(e) => update("provider_reference", e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs text-[#9090BB] mb-1.5 block">Proof Screenshot URL (optional)</label>
          <input
            className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors"
            placeholder="https://... (link to screenshot)"
            value={form.proof_url}
            onChange={(e) => update("proof_url", e.target.value)}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-[#9090BB] mb-1.5 block">Payer Name</label>
            <input
              className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors"
              placeholder="Name on payment"
              value={form.payer_name}
              onChange={(e) => update("payer_name", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-[#9090BB] mb-1.5 block">Payer Email</label>
            <input
              className="w-full bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors"
              placeholder="Email used for payment"
              type="email"
              value={form.payer_email}
              onChange={(e) => update("payer_email", e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full btn-glow-purple bg-[#5E17EB] hover:bg-[#7B3FF5] text-white py-4 rounded-full font-bold text-sm uppercase tracking-wider transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Submitting...
          </>
        ) : "Submit Payment Proof →"}
      </button>
    </form>
  );
}

export default function PaymentProofPage() {
  return (
    <div className="min-h-screen bg-[#050510] circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        <div className="max-w-2xl mx-auto px-4">
          <div className="mb-8">
            <span className="tag-badge">Payment Verification</span>
            <h1 className="text-3xl font-extrabold text-white mt-3 mb-2">Submit Payment Proof</h1>
            <p className="text-[#9090BB] text-sm">
              Submit your payment details securely. We verify all proofs and update your order status promptly.
            </p>
          </div>
          <Suspense fallback={<div className="text-[#9090BB] text-sm">Loading...</div>}>
            <PaymentProofForm />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
