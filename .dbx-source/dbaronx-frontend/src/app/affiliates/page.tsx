"use client";
import React, { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";

const TIERS = [
  {
    name: "Free",
    price: 0,
    color: "#9090BB",
    border: "rgba(144,144,187,0.3)",
    bg: "rgba(144,144,187,0.05)",
    minWatch: 30,
    multiplier: 1.0,
    dailyAds: 5,
    referralRate: "5%",
    features: ["5 ads/day", "30s min watch", "Standard rewards", "Basic referral (5%)", "Community access"],
    cta: "Join Free",
    href: "/register",
  },
  {
    name: "Bronze",
    price: 4.99,
    color: "#CD7F32",
    border: "rgba(205,127,50,0.4)",
    bg: "rgba(205,127,50,0.06)",
    minWatch: 20,
    multiplier: 1.2,
    dailyAds: 10,
    referralRate: "7%",
    features: ["10 ads/day", "20s min watch", "1.2× reward boost", "Referral (7%)", "Priority support"],
    cta: "Upgrade to Bronze",
    href: "/pricing",
  },
  {
    name: "Silver",
    price: 9.99,
    color: "#C0C0C0",
    border: "rgba(192,192,192,0.4)",
    bg: "rgba(192,192,192,0.06)",
    minWatch: 15,
    multiplier: 1.5,
    dailyAds: 20,
    referralRate: "10%",
    features: ["20 ads/day", "15s min watch", "1.5× reward boost", "Referral (10%)", "Premium campaigns"],
    cta: "Upgrade to Silver",
    href: "/pricing",
    popular: true,
  },
  {
    name: "Gold",
    price: 19.99,
    color: "#FFD700",
    border: "rgba(255,215,0,0.4)",
    bg: "rgba(255,215,0,0.06)",
    minWatch: 10,
    multiplier: 2.0,
    dailyAds: 35,
    referralRate: "12%",
    features: ["35 ads/day", "10s min watch", "2.0× reward boost", "Referral (12%)", "Gold-only campaigns", "Early access"],
    cta: "Upgrade to Gold",
    href: "/pricing",
  },
  {
    name: "Platinum",
    price: 39.99,
    color: "#E5E4E2",
    border: "rgba(229,228,226,0.5)",
    bg: "rgba(229,228,226,0.06)",
    minWatch: 5,
    multiplier: 2.5,
    dailyAds: 60,
    referralRate: "15%",
    features: ["60 ads/day", "5s min watch", "2.5× reward boost", "Referral (15%)", "Exclusive campaigns", "VIP payouts", "Dedicated support"],
    cta: "Go Platinum",
    href: "/pricing",
  },
];

const EARNING_EXAMPLES = [
  { tier: "Free", daily: "$0.25", monthly: "$7.50", referral: "$0.50/ref" },
  { tier: "Bronze", daily: "$0.60", monthly: "$18", referral: "$0.84/ref" },
  { tier: "Silver", daily: "$1.50", monthly: "$45", referral: "$1.50/ref" },
  { tier: "Gold", daily: "$3.50", monthly: "$105", referral: "$2.40/ref" },
  { tier: "Platinum", daily: "$7.50", monthly: "$225", referral: "$3.75/ref" },
];

export default function AffiliatePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"users" | "advertisers">("users");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    { q: "How do watch rewards work?", a: "Watch an eligible ad for your tier's minimum time (5–30 seconds), complete the CAPTCHA verification, then confirm. Rewards are credited after validation." },
    { q: "Why is a minimum watch time required?", a: "To ensure genuine engagement and prevent fraud. Advertisers pay for real attention, so we verify each watch meets the minimum threshold before rewarding." },
    { q: "Can I watch the same ad twice for rewards?", a: "No. Each ad can only be rewarded once per 24-hour UTC cycle (00:00–23:59 UTC). This prevents abuse and ensures fair distribution." },
    { q: "What is the UTC reset?", a: "Your daily ad allocation resets at midnight UTC (00:00:00). This is a fixed global time regardless of your timezone." },
    { q: "How do payouts work?", a: "Earnings accumulate in your dashboard. Request payouts via bank transfer, mobile money, crypto, or DBX token once you reach the minimum threshold." },
    { q: "How does the referral system work?", a: "Share your unique referral link. When someone signs up and earns, you receive a percentage commission based on your tier (5%–15%)." },
    { q: "How do advertisers get charged?", a: "Advertisers fund campaigns upfront. Budget is deducted per valid watch completion. Campaigns run until budget is exhausted or the end date is reached." },
    { q: "How does Telegram integration work?", a: "Connect your Telegram account to receive instant notifications for new ads, earnings, referral activity, and payout updates." },
  ];

  return (
    <div className="min-h-screen bg-[#050510] circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-4 py-16 text-center">
          <span className="tag-badge mb-4 inline-block">Affiliate & Watch-to-Earn</span>
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-4">
            Watch. Earn. <span className="gradient-text-purple">Grow.</span>
          </h1>
          <p className="text-[#9090BB] text-lg max-w-2xl mx-auto mb-8">
            Advertisers get real attention. Users get rewarded. Powered by dBaronX.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            <Link href="/register" className="btn-glow-purple bg-[#5E17EB] hover:bg-[#7B3FF5] text-white px-8 py-4 rounded-full font-bold text-sm uppercase tracking-wider transition-all">
              Start Earning →
            </Link>
            <button
              onClick={() => setActiveTab("advertisers")}
              className="btn-glow-cyan bg-transparent border-2 border-[#00F0FF] text-[#00F0FF] hover:bg-[rgba(0,240,255,0.1)] px-8 py-4 rounded-full font-bold text-sm uppercase tracking-wider transition-all"
            >
              Advertise With Us
            </button>
            <a
              href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "dBaronX_bot"}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-transparent border border-[rgba(94,23,235,0.3)] text-[#9090BB] hover:text-white hover:border-[rgba(94,23,235,0.6)] px-8 py-4 rounded-full font-bold text-sm uppercase tracking-wider transition-all"
            >
              Connect Telegram
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { value: "12,400+", label: "Active Earners" },
              { value: "$180K+", label: "Paid Out" },
              { value: "340+", label: "Ad Campaigns" },
              { value: "2.5×", label: "Max Multiplier" },
            ]?.map((s) => (
              <div key={s?.label} className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-xl p-4">
                <p className="text-xl font-bold gradient-text-purple">{s?.value}</p>
                <p className="text-xs text-[#9090BB] mt-1">{s?.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tab Toggle */}
        <div className="max-w-7xl mx-auto px-4 mb-10">
          <div className="flex bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-full p-1 max-w-xs mx-auto">
            <button
              onClick={() => setActiveTab("users")}
              className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${activeTab === "users" ? "bg-[#5E17EB] text-white" : "text-[#9090BB] hover:text-white"}`}
            >
              For Users
            </button>
            <button
              onClick={() => setActiveTab("advertisers")}
              className={`flex-1 py-2 rounded-full text-sm font-semibold transition-all ${activeTab === "advertisers" ? "bg-[#5E17EB] text-white" : "text-[#9090BB] hover:text-white"}`}
            >
              For Advertisers
            </button>
          </div>
        </div>

        {activeTab === "users" && (
          <>
            {/* How It Works */}
            <section className="max-w-7xl mx-auto px-4 mb-16">
              <h2 className="text-2xl font-bold text-white text-center mb-8">How It Works</h2>
              <div className="grid md:grid-cols-4 gap-5">
                {[
                  { step: "01", icon: "👤", title: "Sign Up", desc: "Create your free dBaronX account and choose your tier" },
                  { step: "02", icon: "📺", title: "Watch Ads", desc: "Browse available ads and watch for your tier's minimum time" },
                  { step: "03", icon: "✅", title: "Verify & Confirm", desc: "Complete CAPTCHA verification after minimum watch time" },
                  { step: "04", icon: "💰", title: "Earn & Withdraw", desc: "Rewards credited instantly. Withdraw via multiple methods" },
                ]?.map((s) => (
                  <div key={s?.step} className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl p-5 text-center hover:border-[rgba(94,23,235,0.4)] transition-all">
                    <div className="text-3xl mb-3">{s?.icon}</div>
                    <div className="text-[10px] font-mono text-[#5E17EB] mb-2">{s?.step}</div>
                    <h3 className="text-sm font-bold text-white mb-2">{s?.title}</h3>
                    <p className="text-xs text-[#9090BB] leading-relaxed">{s?.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Tier Cards */}
            <section className="max-w-7xl mx-auto px-4 mb-16">
              <h2 className="text-2xl font-bold text-white text-center mb-3">Subscription Tiers</h2>
              <p className="text-[#9090BB] text-sm text-center mb-8">Higher tier = more ads, faster eligibility, bigger rewards</p>
              <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
                {TIERS?.map((tier) => (
                  <div
                    key={tier?.name}
                    className={`relative bg-[#0D0D2B] rounded-2xl p-5 border transition-all hover:-translate-y-1 ${tier?.popular ? "ring-2 ring-[#5E17EB]" : ""}`}
                    style={{ borderColor: tier?.border, background: tier?.bg }}
                  >
                    {tier?.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#5E17EB] text-white text-[10px] font-bold px-3 py-1 rounded-full">
                        POPULAR
                      </div>
                    )}
                    <div className="text-center mb-4">
                      <p className="text-base font-bold" style={{ color: tier?.color }}>{tier?.name}</p>
                      <p className="text-2xl font-extrabold text-white mt-1">
                        {tier?.price === 0 ? "Free" : `$${tier?.price}`}
                        {tier?.price > 0 && <span className="text-xs text-[#9090BB] font-normal">/mo</span>}
                      </p>
                    </div>
                    <div className="space-y-1.5 mb-5">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#9090BB]">Min watch</span>
                        <span className="text-white font-medium">{tier?.minWatch}s</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#9090BB]">Multiplier</span>
                        <span className="text-white font-medium">{tier?.multiplier}×</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#9090BB]">Daily ads</span>
                        <span className="text-white font-medium">{tier?.dailyAds}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#9090BB]">Referral</span>
                        <span className="text-white font-medium">{tier?.referralRate}</span>
                      </div>
                    </div>
                    <Link
                      href={tier?.href}
                      className="block text-center text-xs font-bold py-2 rounded-full border transition-all"
                      style={{ borderColor: tier?.border, color: tier?.color }}
                    >
                      {tier?.cta}
                    </Link>
                  </div>
                ))}
              </div>
            </section>

            {/* Earnings Example */}
            <section className="max-w-7xl mx-auto px-4 mb-16">
              <h2 className="text-2xl font-bold text-white text-center mb-8">Earning Potential</h2>
              <div className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[rgba(94,23,235,0.15)]">
                        <th className="text-left px-5 py-4 text-xs font-semibold text-[#9090BB] uppercase tracking-wider">Tier</th>
                        <th className="text-right px-5 py-4 text-xs font-semibold text-[#9090BB] uppercase tracking-wider">Daily Est.</th>
                        <th className="text-right px-5 py-4 text-xs font-semibold text-[#9090BB] uppercase tracking-wider">Monthly Est.</th>
                        <th className="text-right px-5 py-4 text-xs font-semibold text-[#9090BB] uppercase tracking-wider">Per Referral</th>
                      </tr>
                    </thead>
                    <tbody>
                      {EARNING_EXAMPLES?.map((row, i) => (
                        <tr key={row?.tier} className={`border-b border-[rgba(94,23,235,0.08)] ${i % 2 === 0 ? "" : "bg-[rgba(94,23,235,0.03)]"}`}>
                          <td className="px-5 py-3 font-semibold text-white">{row?.tier}</td>
                          <td className="px-5 py-3 text-right text-[#22C55E]">{row?.daily}</td>
                          <td className="px-5 py-3 text-right text-[#22C55E] font-semibold">{row?.monthly}</td>
                          <td className="px-5 py-3 text-right text-[#C084FC]">{row?.referral}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-[#9090BB] px-5 py-3">* Estimates based on full daily ad allocation. Actual earnings vary.</p>
              </div>
            </section>

            {/* Platform Rules */}
            <section className="max-w-7xl mx-auto px-4 mb-16">
              <h2 className="text-2xl font-bold text-white text-center mb-8">Platform Rules & Anti-Fraud</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { icon: "⏱️", title: "Minimum Watch Time", desc: "Rewards only count after your tier's minimum watch threshold (5–30 seconds). Timer is server-verified." },
                  { icon: "🔄", title: "24-Hour No-Repeat", desc: "Each ad can only be rewarded once per UTC day (00:00–23:59). Duplicate watches are automatically blocked." },
                  { icon: "🤖", title: "CAPTCHA Required", desc: "After reaching minimum watch time, complete CAPTCHA verification before confirming. Bot activity is detected and blocked." },
                  { icon: "🌐", title: "UTC Reset", desc: "Daily ad allocation resets at midnight UTC globally. Your timezone does not affect the reset time." },
                  { icon: "🔍", title: "Validation Delay", desc: "Rewards may be delayed pending backend validation. Invalid, duplicate, or suspicious watches are rejected." },
                  { icon: "🛡️", title: "Anti-Manipulation", desc: "VPN abuse, bot activity, and coordinated manipulation result in account suspension and reward forfeiture." },
                ]?.map((rule) => (
                  <div key={rule?.title} className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.15)] rounded-xl p-5">
                    <div className="text-2xl mb-3">{rule?.icon}</div>
                    <h3 className="text-sm font-bold text-white mb-2">{rule?.title}</h3>
                    <p className="text-xs text-[#9090BB] leading-relaxed">{rule?.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {activeTab === "advertisers" && (
          <section className="max-w-7xl mx-auto px-4 mb-16">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white mb-3">Reach Real Audiences</h2>
              <p className="text-[#9090BB] max-w-xl mx-auto text-sm">
                Your ads are watched by verified users who earn rewards for genuine attention. No bots. No fake views.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
              {[
                { icon: "👁️", title: "Real Watch Attention", desc: "Users must watch for minimum time before rewards. Guaranteed genuine engagement." },
                { icon: "📊", title: "Campaign Analytics", desc: "Track impressions, completions, click-throughs, and geographic distribution in real time." },
                { icon: "🎯", title: "Targeted Reach", desc: "Target by country, city, category interest, and subscription tier for maximum relevance." },
                { icon: "💰", title: "Budget Control", desc: "Set daily and total campaign budgets. Only pay for validated watch completions." },
                { icon: "🌍", title: "Global Audience", desc: "Reach dBaronX users across Africa, Middle East, Europe, and beyond." },
                { icon: "⚡", title: "Fast Activation", desc: "Submit your campaign, fund your budget, and go live within 24 hours after review." },
              ]?.map((b) => (
                <div key={b?.title} className="bg-[#0D0D2B] border border-[rgba(0,240,255,0.15)] rounded-xl p-5 hover:border-[rgba(0,240,255,0.3)] transition-all">
                  <div className="text-2xl mb-3">{b?.icon}</div>
                  <h3 className="text-sm font-bold text-white mb-2">{b?.title}</h3>
                  <p className="text-xs text-[#9090BB] leading-relaxed">{b?.desc}</p>
                </div>
              ))}
            </div>
            <div className="text-center">
              <Link href="/advertisers/apply" className="btn-glow-cyan bg-transparent border-2 border-[#00F0FF] text-[#00F0FF] hover:bg-[rgba(0,240,255,0.1)] px-10 py-4 rounded-full font-bold text-sm uppercase tracking-wider transition-all inline-block">
                Launch Your Campaign →
              </Link>
            </div>
          </section>
        )}

        {/* Telegram Section */}
        <section className="max-w-7xl mx-auto px-4 mb-16">
          <div className="bg-gradient-to-br from-[rgba(0,240,255,0.08)] to-[rgba(94,23,235,0.08)] border border-[rgba(0,240,255,0.2)] rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">🤖 Connect Telegram Bot</h2>
              <p className="text-[#9090BB] text-sm mb-3">Get instant notifications for new ads, earnings, referrals, and payouts.</p>
              <div className="flex flex-wrap gap-2">
                {["New ad alerts", "Earnings updates", "Referral notifications", "Payout status"]?.map((f) => (
                  <span key={f} className="text-xs text-[#00F0FF] bg-[rgba(0,240,255,0.08)] border border-[rgba(0,240,255,0.2)] px-3 py-1 rounded-full">{f}</span>
                ))}
              </div>
            </div>
            <a
              href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "dBaronX_bot"}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glow-cyan bg-transparent border-2 border-[#00F0FF] text-[#00F0FF] hover:bg-[rgba(0,240,255,0.1)] px-8 py-3 rounded-full font-bold text-sm whitespace-nowrap transition-all"
            >
              Connect Telegram →
            </a>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-4 mb-16">
          <h2 className="text-2xl font-bold text-white text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {faqs?.map((faq, i) => (
              <div key={i} className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-white">{faq?.q}</span>
                  <svg className={`w-4 h-4 text-[#9090BB] flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-xs text-[#9090BB] leading-relaxed border-t border-[rgba(94,23,235,0.1)] pt-3">
                    {faq?.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-4xl mx-auto px-4 text-center">
          <div className="bg-gradient-to-br from-[rgba(94,23,235,0.15)] to-[rgba(0,240,255,0.05)] border border-[rgba(94,23,235,0.3)] rounded-2xl p-10">
            <h2 className="text-3xl font-bold text-white mb-3">Ready to Start Earning?</h2>
            <p className="text-[#9090BB] text-sm mb-8">Join thousands of users earning daily with dBaronX Watch-to-Earn.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/register" className="btn-glow-purple bg-[#5E17EB] hover:bg-[#7B3FF5] text-white px-8 py-3 rounded-full font-bold text-sm transition-all">Start Earning →</Link>
              <Link href="/pricing" className="bg-transparent border border-[rgba(94,23,235,0.3)] text-[#9090BB] hover:text-white px-8 py-3 rounded-full font-semibold text-sm transition-all">View Plans</Link>
              <Link href="/advertisers/apply" className="btn-glow-cyan bg-transparent border border-[#00F0FF] text-[#00F0FF] px-8 py-3 rounded-full font-bold text-sm transition-all">Advertise With Us</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
