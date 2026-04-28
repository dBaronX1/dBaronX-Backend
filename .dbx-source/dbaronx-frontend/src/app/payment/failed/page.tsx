"use client";
import React from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PaymentFailedPage() {
  return (
    <div className="min-h-screen bg-[#050510] circuit-bg">
      <Header />
      <main className="pt-24 pb-20 flex items-center justify-center">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="w-20 h-20 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.3)] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span className="tag-badge mb-4 inline-block" style={{ color: "#F87171", borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)" }}>Payment Failed</span>
          <h1 className="text-3xl font-extrabold text-white mb-3">Payment Unsuccessful</h1>
          <p className="text-[#9090BB] text-sm mb-4">Your payment could not be processed. No charges have been made.</p>
          <div className="bg-[rgba(239,68,68,0.04)] border border-[rgba(239,68,68,0.15)] rounded-xl p-4 mb-8 text-left">
            <p className="text-xs font-semibold text-red-400 mb-2">Common reasons:</p>
            <ul className="text-xs text-[#9090BB] space-y-1 list-disc list-inside">
              <li>Insufficient funds or card limit</li>
              <li>Card declined by issuing bank</li>
              <li>Network or connection timeout</li>
              <li>Invalid card details</li>
            </ul>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/checkout" className="btn-glow-purple bg-[#5E17EB] hover:bg-[#7B3FF5] text-white px-6 py-3 rounded-full font-bold text-sm transition-all">Try Again →</Link>
            <Link href="/payment-proof" className="bg-transparent border border-[rgba(94,23,235,0.3)] text-[#9090BB] hover:text-white px-6 py-3 rounded-full font-semibold text-sm transition-all">Manual Payment</Link>
          </div>
          <p className="text-xs text-[#9090BB] mt-6">
            Need help?{" "}
            <a href="mailto:info@dbaronx.com" className="text-[#C084FC] hover:text-[#5E17EB] transition-colors">Contact support →</a>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
