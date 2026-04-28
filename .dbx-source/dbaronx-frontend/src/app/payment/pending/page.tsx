"use client";
import React from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PaymentPendingPage() {
  return (
    <div className="min-h-screen bg-[#050510] circuit-bg">
      <Header />
      <main className="pt-24 pb-20 flex items-center justify-center">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="w-20 h-20 bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.3)] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-[#F59E0B] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <span className="tag-badge mb-4 inline-block" style={{ color: "#F59E0B", borderColor: "rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.08)" }}>Payment Pending</span>
          <h1 className="text-3xl font-extrabold text-white mb-3">Payment Processing</h1>
          <p className="text-[#9090BB] text-sm mb-4">Your payment is being processed. This may take a few minutes.</p>
          <div className="bg-[rgba(245,158,11,0.04)] border border-[rgba(245,158,11,0.2)] rounded-xl p-4 mb-8 text-left">
            <p className="text-xs text-[#9090BB]">If you've already made a manual payment, please <Link href="/payment-proof" className="text-[#F59E0B] hover:text-[#D97706] transition-colors">submit your payment proof</Link> to speed up verification.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/payment-proof" className="bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.4)] text-[#F59E0B] px-6 py-3 rounded-full font-bold text-sm transition-all hover:bg-[rgba(245,158,11,0.2)]">Submit Proof →</Link>
            <Link href="/order-status" className="bg-transparent border border-[rgba(94,23,235,0.3)] text-[#9090BB] hover:text-white px-6 py-3 rounded-full font-semibold text-sm transition-all">Track Order</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
