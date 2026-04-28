"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getOrderByReference } from "@/lib/api";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  pending: { label: "Pending", color: "#F59E0B", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.3)", icon: "⏳" },
  proof_submitted: { label: "Proof Submitted", color: "#00F0FF", bg: "rgba(0,240,255,0.08)", border: "rgba(0,240,255,0.3)", icon: "📋" },
  confirmed: { label: "Confirmed", color: "#22C55E", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.3)", icon: "✅" },
  paid: { label: "Paid", color: "#22C55E", bg: "rgba(34,197,94,0.1)", border: "rgba(34,197,94,0.4)", icon: "💰" },
  processing: { label: "Processing", color: "#C084FC", bg: "rgba(192,132,252,0.08)", border: "rgba(192,132,252,0.3)", icon: "⚙️" },
  fulfilled: { label: "Fulfilled", color: "#4ADE80", bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.4)", icon: "📦" },
};

const STATUS_TIMELINE = ["pending", "proof_submitted", "confirmed", "paid", "processing", "fulfilled"];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: "#9090BB", bg: "rgba(144,144,187,0.08)", border: "rgba(144,144,187,0.3)", icon: "•" };
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border"
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}

function OrderStatusContent() {
  const searchParams = useSearchParams();
  const [reference, setReference] = useState(searchParams?.get("reference") || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    const ref = searchParams?.get("reference");
    if (ref) {
      setReference(ref);
      lookupOrder(ref);
    }
  }, []);

  async function lookupOrder(ref: string) {
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const result = await getOrderByReference(ref);
      setOrder(result.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order not found. Please check your reference.");
    } finally {
      setLoading(false);
    }
  }

  async function onLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!reference.trim()) return;
    await lookupOrder(reference.trim());
  }

  const currentStatusIndex = order ? STATUS_TIMELINE.indexOf(order.payment_status || order.operational_status) : -1;

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl p-6">
        <form onSubmit={onLookup} className="flex gap-3">
          <input
            className="flex-1 bg-[#050510] border border-[rgba(94,23,235,0.25)] text-white placeholder-[#9090BB] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-[rgba(94,23,235,0.6)] transition-colors"
            placeholder="Enter your order reference (e.g. MO-XXXXXXX)"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-glow-purple bg-[#5E17EB] hover:bg-[#7B3FF5] text-white px-6 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : "Track →"}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {order && (
        <div className="space-y-5">
          {/* Order Summary */}
          <div className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-[#9090BB] font-mono mb-1">Order Reference</p>
                <p className="text-lg font-mono font-bold text-[#00F0FF]">{order.public_reference}</p>
              </div>
              <StatusBadge status={order.payment_status || "pending"} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-[#9090BB] mb-1">Customer</p>
                <p className="text-white font-medium">{order.customer_name}</p>
              </div>
              <div>
                <p className="text-xs text-[#9090BB] mb-1">Amount</p>
                <p className="text-white font-semibold">{order.total_amount} {order.currency}</p>
              </div>
              {order.fulfillment_status && (
                <div>
                  <p className="text-xs text-[#9090BB] mb-1">Fulfillment</p>
                  <StatusBadge status={order.fulfillment_status} />
                </div>
              )}
              {order.operational_status && (
                <div>
                  <p className="text-xs text-[#9090BB] mb-1">Operations</p>
                  <StatusBadge status={order.operational_status} />
                </div>
              )}
            </div>
          </div>

          {/* Status Timeline */}
          <div className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white mb-5">Order Timeline</h3>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-px bg-[rgba(94,23,235,0.2)]" />
              <div className="space-y-4">
                {STATUS_TIMELINE.map((status, i) => {
                  const cfg = STATUS_CONFIG[status];
                  const isCompleted = i <= currentStatusIndex;
                  const isCurrent = i === currentStatusIndex;
                  return (
                    <div key={status} className="flex items-center gap-4 pl-10 relative">
                      <div
                        className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all ${
                          isCompleted
                            ? "border-[#22C55E] bg-[rgba(34,197,94,0.15)]"
                            : "border-[rgba(94,23,235,0.2)] bg-[#050510]"
                        } ${isCurrent ? "ring-2 ring-[rgba(34,197,94,0.3)]" : ""}`}
                      >
                        {isCompleted ? "✓" : <span className="text-[#9090BB] text-xs">{i + 1}</span>}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${isCompleted ? "text-white" : "text-[#9090BB]"}`}>
                          {cfg?.label || status}
                        </p>
                        {isCurrent && (
                          <p className="text-xs text-[#22C55E] mt-0.5">Current status</p>
                        )}
                      </div>
                      {isCompleted && <span className="text-lg">{cfg?.icon}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Next Steps */}
          {order.payment_status === "pending" && (
            <div className="bg-[rgba(245,158,11,0.04)] border border-[rgba(245,158,11,0.2)] rounded-xl p-4">
              <p className="text-xs font-semibold text-[#F59E0B] mb-2">⚡ Action Required</p>
              <p className="text-xs text-[#9090BB] mb-3">Your order is pending payment. Please submit your payment proof to proceed.</p>
              <Link
                href={`/payment-proof?reference=${encodeURIComponent(order.public_reference)}`}
                className="inline-flex items-center gap-2 text-xs font-bold text-[#F59E0B] bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)] px-4 py-2 rounded-full hover:bg-[rgba(245,158,11,0.15)] transition-colors"
              >
                Submit Payment Proof →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Support */}
      <div className="bg-[rgba(94,23,235,0.04)] border border-[rgba(94,23,235,0.15)] rounded-xl p-5 text-center">
        <p className="text-xs text-[#9090BB]">
          Need help with your order?{" "}
          <a href="mailto:info@dbaronx.com" className="text-[#C084FC] hover:text-[#5E17EB] transition-colors font-medium">
            Contact Support →
          </a>
        </p>
      </div>
    </div>
  );
}

export default function OrderStatusPage() {
  return (
    <div className="min-h-screen bg-[#050510] circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        <div className="max-w-2xl mx-auto px-4">
          <div className="mb-8">
            <span className="tag-badge">Order Tracking</span>
            <h1 className="text-3xl font-extrabold text-white mt-3 mb-2">Track Your Order</h1>
            <p className="text-[#9090BB] text-sm">Enter your order reference to check the current status and payment verification.</p>
          </div>
          <Suspense fallback={<div className="text-[#9090BB] text-sm">Loading...</div>}>
            <OrderStatusContent />
          </Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
