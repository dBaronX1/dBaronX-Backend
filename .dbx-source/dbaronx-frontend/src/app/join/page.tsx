"use client";
import React, { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function JoinPage() {
  const [role, setRole] = useState<"shopper" | "creator" | "affiliate" | "supplier">("shopper");

  const roles = [
    { id: "shopper", icon: "🛍️", title: "Shopper", desc: "Browse and buy premium products" },
    { id: "creator", icon: "✨", title: "AI Creator", desc: "Create and monetize AI stories" },
    { id: "affiliate", icon: "🤝", title: "Affiliate", desc: "Earn by watching ads and referring" },
    { id: "supplier", icon: "🏭", title: "Supplier", desc: "List and sell your products" },
  ] as const;

  const benefits: Record<string, string[]> = {
    shopper: ["Access to premium global products", "Secure pay-first protection", "DBX member discounts", "Order tracking dashboard", "Multiple payment methods"],
    creator: ["AI story generation credits", "Marketplace publishing", "Creator revenue sharing", "Story library management", "Premium genre access"],
    affiliate: ["Daily watch-to-earn ads", "Referral commission system", "Tier-based earning boosts", "Telegram bot notifications", "Multiple payout methods"],
    supplier: ["Global customer reach", "Guaranteed payment model", "Order management dashboard", "Analytics and reporting", "Dedicated account support"],
  };

  return (
    <div className="min-h-screen bg-[#050510] circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="py-10 text-center">
            <span className="tag-badge mb-4 inline-block">Join dBaronX</span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
              Start Your <span className="gradient-text-purple">dBaronX Journey</span>
            </h1>
            <p className="text-[#9090BB] max-w-xl mx-auto text-sm">
              One platform. Multiple ways to participate. Choose your role and start today.
            </p>
          </div>

          {/* Role Selector */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => setRole(r.id)}
                className={`p-4 rounded-2xl border text-center transition-all ${
                  role === r.id
                    ? "bg-[rgba(94,23,235,0.2)] border-[rgba(94,23,235,0.5)] shadow-[0_0_20px_rgba(94,23,235,0.15)]"
                    : "bg-[#0D0D2B] border-[rgba(94,23,235,0.15)] hover:border-[rgba(94,23,235,0.3)]"
                }`}
              >
                <div className="text-2xl mb-2">{r.icon}</div>
                <p className="text-sm font-bold text-white">{r.title}</p>
                <p className="text-xs text-[#9090BB] mt-1">{r.desc}</p>
              </button>
            ))}
          </div>

          {/* Benefits */}
          <div className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl p-6 mb-8">
            <h2 className="text-base font-bold text-white mb-4">
              {roles.find((r) => r.id === role)?.icon} {roles.find((r) => r.id === role)?.title} Benefits
            </h2>
            <div className="grid md:grid-cols-2 gap-2">
              {benefits[role]?.map((b) => (
                <div key={b} className="flex items-center gap-2 text-sm text-[#9090BB]">
                  <span className="text-[#22C55E]">✓</span> {b}
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center space-y-4">
            {role === "supplier" ? (
              <Link href="/suppliers/apply" className="btn-glow-purple bg-[#5E17EB] hover:bg-[#7B3FF5] text-white px-10 py-4 rounded-full font-bold text-sm uppercase tracking-wider transition-all inline-block">
                Apply as Supplier →
              </Link>
            ) : (
              <Link href="/register" className="btn-glow-purple bg-[#5E17EB] hover:bg-[#7B3FF5] text-white px-10 py-4 rounded-full font-bold text-sm uppercase tracking-wider transition-all inline-block">
                Create Free Account →
              </Link>
            )}
            <p className="text-xs text-[#9090BB]">
              Already have an account?{" "}
              <Link href="/login" className="text-[#C084FC] hover:text-[#5E17EB] transition-colors">Sign in →</Link>
            </p>
          </div>

          {/* Trust */}
          <div className="mt-12 grid grid-cols-3 gap-4 text-center">
            {[
              { value: "50K+", label: "Members" },
              { value: "99.9%", label: "Uptime" },
              { value: "180+", label: "Countries" },
            ].map((s) => (
              <div key={s.label} className="bg-[rgba(94,23,235,0.04)] border border-[rgba(94,23,235,0.1)] rounded-xl p-4">
                <p className="text-xl font-bold gradient-text-purple">{s.value}</p>
                <p className="text-xs text-[#9090BB] mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
