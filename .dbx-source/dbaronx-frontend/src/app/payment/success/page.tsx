"use client";
import React from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-[#050510] circuit-bg">
      <Header />
      <main className="pt-24 pb-20 flex items-center justify-center">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="w-20 h-20 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-[#22C55E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="tag-badge-green mb-4 inline-block">Payment Successful</span>
          <h1 className="text-3xl font-extrabold text-white mb-3">Payment Confirmed!</h1>
          <p className="text-[#9090BB] text-sm mb-8">Your payment has been successfully processed. Your order is now being prepared.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/order-status" className="btn-glow-purple bg-[#5E17EB] hover:bg-[#7B3FF5] text-white px-6 py-3 rounded-full font-bold text-sm transition-all">Track Order →</Link>
            <Link href="/products" className="bg-transparent border border-[rgba(94,23,235,0.3)] text-[#9090BB] hover:text-white px-6 py-3 rounded-full font-semibold text-sm transition-all">Continue Shopping</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
