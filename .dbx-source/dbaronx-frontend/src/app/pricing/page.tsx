"use client";
import React, { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const PLANS = [
  {
    name: "Free",
    price: 0,
    period: "",
    color: "#9090BB",
    border: "rgba(144,144,187,0.3)",
    features: [
      "5 ads/day (Watch-to-Earn)",
      "30s minimum watch time",
      "1.0× reward multiplier",
      "5% referral commission",
      "3 AI story credits/month",
      "Basic shop access",
      "Community support",
    ],
    cta: "Get Started Free",
    href: "/register",
  },
  {
    name: "Bronze",
    price: 4.99,
    period: "/month",
    color: "#CD7F32",
    border: "rgba(205,127,50,0.4)",
    features: [
      "10 ads/day (Watch-to-Earn)",
      "20s minimum watch time",
      "1.2× reward multiplier",
      "7% referral commission",
      "10 AI story credits/month",
      "Priority shop access",
      "Email support",
    ],
    cta: "Start Bronze",
    href: "/register?plan=bronze",
  },
  {
    name: "Silver",
    price: 9.99,
    period: "/month",
    color: "#C0C0C0",
    border: "rgba(192,192,192,0.4)",
    popular: true,
    features: [
      "20 ads/day (Watch-to-Earn)",
      "15s minimum watch time",
      "1.5× reward multiplier",
      "10% referral commission",
      "25 AI story credits/month",
      "Premium campaigns access",
      "Priority support",
      "DBX token rewards",
    ],
    cta: "Start Silver",
    href: "/register?plan=silver",
  },
  {
    name: "Gold",
    price: 19.99,
    period: "/month",
    color: "#FFD700",
    border: "rgba(255,215,0,0.4)",
    features: [
      "35 ads/day (Watch-to-Earn)",
      "10s minimum watch time",
      "2.0× reward multiplier",
      "12% referral commission",
      "60 AI story credits/month",
      "Gold-only campaigns",
      "Early access features",
      "Enhanced DBX rewards",
      "Dedicated support",
    ],
    cta: "Start Gold",
    href: "/register?plan=gold",
  },
  {
    name: "Platinum",
    price: 39.99,
    period: "/month",
    color: "#E5E4E2",
    border: "rgba(229,228,226,0.5)",
    features: [
      "60 ads/day (Watch-to-Earn)",
      "5s minimum watch time",
      "2.5× reward multiplier",
      "15% referral commission",
      "Unlimited AI story credits",
      "Exclusive VIP campaigns",
      "Highest payout priority",
      "Maximum DBX rewards",
      "VIP dedicated support",
      "Supplier/advertiser access",
    ],
    cta: "Go Platinum",
    href: "/register?plan=platinum",
  },
];

const BUSINESS_PLANS = [
  {
    name: "Supplier",
    price: "Custom",
    color: "#22C55E",
    border: "rgba(34,197,94,0.3)",
    features: ["Product listing access", "Order fulfillment dashboard", "Margin management tools", "Analytics & reporting", "Priority placement", "Dedicated account manager"],
    cta: "Apply as Supplier",
    href: "/suppliers/apply",
  },
  {
    name: "Advertiser",
    price: "From $50",
    color: "#00F0FF",
    border: "rgba(0,240,255,0.3)",
    features: ["Campaign creation tools", "Targeted audience reach", "Real watch verification", "Campaign analytics", "Budget control", "Global reach"],
    cta: "Start Advertising",
    href: "/advertisers/apply",
  },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  return (
    <div className="min-h-screen bg-[#050510] circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        <div className="max-w-7xl mx-auto px-4">
          {/* Hero */}
          <div className="py-12 text-center">
            <span className="tag-badge mb-4 inline-block">Pricing & Plans</span>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
              Choose Your <span className="gradient-text-purple">dBaronX Plan</span>
            </h1>
            <p className="text-[#9090BB] max-w-xl mx-auto text-sm mb-6">
              Start free and upgrade as you grow. Every tier unlocks more earning power, story credits, and platform benefits.
            </p>
            <div className="flex bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-full p-1 max-w-xs mx-auto">
              <button
                onClick={() => setBilling("monthly")}
                className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${billing === "monthly" ? "bg-[#5E17EB] text-white" : "text-[#9090BB] hover:text-white"}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling("yearly")}
                className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${billing === "yearly" ? "bg-[#5E17EB] text-white" : "text-[#9090BB] hover:text-white"}`}
              >
                Yearly <span className="text-[#22C55E] text-[10px]">-20%</span>
              </button>
            </div>
          </div>

          {/* Plan Cards */}
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4 mb-16">
            {PLANS?.map((plan) => {
              const price = billing === "yearly" && plan?.price > 0 ? (plan?.price * 0.8)?.toFixed(2) : plan?.price;
              return (
                <div
                  key={plan?.name}
                  className={`relative bg-[#0D0D2B] rounded-2xl p-5 border transition-all hover:-translate-y-1 ${plan?.popular ? "ring-2 ring-[#5E17EB] shadow-[0_0_30px_rgba(94,23,235,0.2)]" : ""}`}
                  style={{ borderColor: plan?.border }}
                >
                  {plan?.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#5E17EB] text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap">
                      MOST POPULAR
                    </div>
                  )}
                  <div className="text-center mb-5">
                    <p className="text-base font-bold mb-1" style={{ color: plan?.color }}>{plan?.name}</p>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-2xl font-extrabold text-white">
                        {plan?.price === 0 ? "Free" : `$${price}`}
                      </span>
                      {plan?.price > 0 && (
                        <span className="text-xs text-[#9090BB]">{billing === "yearly" ? "/mo" : plan?.period}</span>
                      )}
                    </div>
                    {billing === "yearly" && plan?.price > 0 && (
                      <p className="text-[10px] text-[#22C55E] mt-1">Billed ${(Number(price) * 12)?.toFixed(0)}/year</p>
                    )}
                  </div>
                  <ul className="space-y-2 mb-5">
                    {plan?.features?.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-[#9090BB]">
                        <span className="text-[#22C55E] flex-shrink-0 mt-0.5">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan?.href}
                    className="block text-center text-xs font-bold py-2.5 rounded-full border transition-all hover:opacity-80"
                    style={{ borderColor: plan?.border, color: plan?.color, background: `${plan?.color}10` }}
                  >
                    {plan?.cta}
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Feature Comparison */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-white text-center mb-8">What's Included</h2>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                {
                  icon: "📺",
                  title: "Watch-to-Earn",
                  items: ["Daily ad allocation by tier", "Tier-based minimum watch time", "Reward multiplier boost", "Anti-fraud CAPTCHA verification", "24-hour UTC reset cycle"],
                },
                {
                  icon: "✨",
                  title: "AI Stories",
                  items: ["Monthly story generation credits", "Multiple genres & tones", "Marketplace publishing", "Creator revenue sharing", "Story library management"],
                },
                {
                  icon: "🤝",
                  title: "Affiliate & Referrals",
                  items: ["Unique referral link", "Commission on referral earnings", "Tier-based commission rates", "Real-time referral tracking", "Payout via multiple methods"],
                },
              ]?.map((section) => (
                <div key={section?.title} className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl p-6">
                  <div className="text-3xl mb-3">{section?.icon}</div>
                  <h3 className="text-base font-bold text-white mb-4">{section?.title}</h3>
                  <ul className="space-y-2">
                    {section?.items?.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-[#9090BB]">
                        <span className="text-[#5E17EB] flex-shrink-0">→</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Business Plans */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-white text-center mb-3">Business Plans</h2>
            <p className="text-[#9090BB] text-sm text-center mb-8">For suppliers and advertisers joining the dBaronX ecosystem</p>
            <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
              {BUSINESS_PLANS?.map((plan) => (
                <div
                  key={plan?.name}
                  className="bg-[#0D0D2B] rounded-2xl p-6 border transition-all hover:-translate-y-1"
                  style={{ borderColor: plan?.border }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-lg font-bold" style={{ color: plan?.color }}>{plan?.name}</p>
                    <span className="text-sm font-bold text-white">{plan?.price}</span>
                  </div>
                  <ul className="space-y-2 mb-5">
                    {plan?.features?.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-[#9090BB]">
                        <span style={{ color: plan?.color }} className="flex-shrink-0">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan?.href}
                    className="block text-center text-sm font-bold py-3 rounded-full border transition-all hover:opacity-80"
                    style={{ borderColor: plan?.border, color: plan?.color, background: `${plan?.color}10` }}
                  >
                    {plan?.cta} →
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-[#9090BB] text-sm">
              Questions about pricing?{" "}
              <a href="mailto:info@dbaronx.com" className="text-[#C084FC] hover:text-[#5E17EB] transition-colors">Contact us →</a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
