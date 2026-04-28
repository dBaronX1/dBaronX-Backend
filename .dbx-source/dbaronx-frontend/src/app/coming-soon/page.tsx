"use client";
import React, { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

interface ModuleCardProps {
  icon: string;
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  features: string[];
  ctaLabel: string;
  ctaHref?: string;
  accent: string;
}

function ModuleCard({ icon, title, description, badge, badgeColor, features, ctaLabel, ctaHref, accent }: ModuleCardProps) {
  return (
    <div
      className="card-hover-glow bg-bg-card rounded-3xl p-6 flex flex-col gap-4 relative overflow-hidden border border-[rgba(94,23,235,0.15)]">
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{ background: `radial-gradient(ellipse at 80% 20%, ${accent}15 0%, transparent 60%)` }}
        aria-hidden="true" />
      <div className="relative z-10 flex flex-col gap-4 h-full">
        <div className="flex items-start justify-between">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: `${accent}15`, border: `1px solid ${accent}30` }}>
            {icon}
          </div>
          <span
            className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
            style={{ background: `${badgeColor}15`, border: `1px solid ${badgeColor}30`, color: badgeColor }}>
            {badge}
          </span>
        </div>
        <div>
          <h3 className="font-bold text-white text-base mb-2">{title}</h3>
          <p className="text-fg-muted text-xs leading-relaxed">{description}</p>
        </div>
        <ul className="space-y-1.5 flex-1">
          {features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-xs text-fg-muted">
              <span style={{ color: accent }}>→</span> {f}
            </li>
          ))}
        </ul>
        {ctaHref ? (
          <Link
            href={ctaHref}
            className="mt-auto text-center text-xs font-bold py-2.5 px-4 rounded-xl border transition-all"
            style={{ borderColor: `${accent}40`, color: accent }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `${accent}15`; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
            {ctaLabel}
          </Link>
        ) : (
          <button
            disabled
            className="mt-auto text-center text-xs font-bold py-2.5 px-4 rounded-xl border opacity-50 cursor-not-allowed"
            style={{ borderColor: `${accent}40`, color: accent }}>
            {ctaLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ComingSoonPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  const modules: ModuleCardProps[] = [
    {
      icon: "🎬",
      title: "Watch & Earn",
      description: "Watch approved ads for 20+ seconds and earn real rewards. Tier-based earning system with daily ad allocations.",
      badge: "Early Access Soon",
      badgeColor: "#00F0FF",
      features: ["Tier-based earning multipliers", "CAPTCHA-verified rewards", "Daily ad allocations", "Telegram notifications"],
      ctaLabel: "View Platform →",
      ctaHref: "/watch-earn",
      accent: "#00F0FF",
    },
    {
      icon: "🤝",
      title: "Affiliate Platform",
      description: "Earn commissions by referring customers and advertisers. Referral links, leaderboards, and payout management.",
      badge: "Launching Soon",
      badgeColor: "#C084FC",
      features: ["Referral commission system", "Advertiser campaign tools", "Payout management", "Performance analytics"],
      ctaLabel: "View Platform →",
      ctaHref: "/affiliates",
      accent: "#C084FC",
    },
    {
      icon: "✨",
      title: "AI Stories",
      description: "AI-powered story generation with multiple genres. Create, save, and share unique stories powered by advanced AI.",
      badge: "In Development",
      badgeColor: "#F59E0B",
      features: ["Multiple story genres", "Series creation", "AI-powered generation", "Story library"],
      ctaLabel: "View Platform →",
      ctaHref: "/ai-stories",
      accent: "#F59E0B",
    },
    {
      icon: "💎",
      title: "DBX Token",
      description: "The dBaronX utility token on Solana. Stake for rewards, unlock discounts, and participate in governance.",
      badge: "Presale Access",
      badgeColor: "#5E17EB",
      features: ["Staking rewards", "Member discounts", "Governance voting", "Ecosystem utility"],
      ctaLabel: "View Token →",
      ctaHref: "/dbx-token",
      accent: "#5E17EB",
    },
    {
      icon: "💫",
      title: "Dreams Crowdfunding",
      description: "Community-powered crowdfunding for impactful projects. Back dreams, earn rewards, and track real-world impact.",
      badge: "Coming Soon",
      badgeColor: "#4ADE80",
      features: ["Community campaigns", "Impact tracking", "Backer rewards", "On-chain verification"],
      ctaLabel: "View Dreams →",
      ctaHref: "/dreams",
      accent: "#4ADE80",
    },
    {
      icon: "🤖",
      title: "Telegram Tools",
      description: "Advanced Telegram automation and bot tools for the dBaronX ecosystem. Shop, track, and earn via Telegram.",
      badge: "Available Now",
      badgeColor: "#00F0FF",
      features: ["Shop via Telegram", "Order tracking", "Affiliate management", "Automated notifications"],
      ctaLabel: "Open Bot →",
      ctaHref: process.env.NEXT_PUBLIC_TELEGRAM_BOT_LINK || "https://t.me/dBaronX_DBX_Token",
      accent: "#00F0FF",
    },
    {
      icon: "🪙",
      title: "Crypto Payments",
      description: "Pay with Solana, DBX tokens, and other cryptocurrencies. Wallet integration and on-chain payment verification.",
      badge: "Partially Live",
      badgeColor: "#F59E0B",
      features: ["Solana Pay support", "DBX token payments", "On-chain verification", "Wallet integration"],
      ctaLabel: "Shop Now →",
      ctaHref: "/shop",
      accent: "#F59E0B",
    },
    {
      icon: "🪪",
      title: "Premium ID Card",
      description: "Your dBaronX digital identity card. Showcase your membership tier, DBX holdings, and ecosystem achievements.",
      badge: "Available",
      badgeColor: "#C084FC",
      features: ["Digital identity", "Tier showcase", "Achievement badges", "Shareable profile"],
      ctaLabel: "Get ID Card →",
      ctaHref: "/id-card",
      accent: "#C084FC",
    },
  ];

  return (
    <div className="min-h-screen bg-bg-base circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        <div className="max-w-7xl mx-auto px-4">
          {/* Hero */}
          <div className="text-center py-14">
            <div className="tag-badge inline-flex items-center gap-1 mb-6">
              <span>🚀</span> dBaronX Ecosystem
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold gradient-text-purple mb-4">
              The Full dBaronX Platform
            </h1>
            <p className="text-fg-muted max-w-2xl mx-auto text-sm leading-relaxed mb-8">
              dBaronX is more than a shop. It&apos;s a complete ecosystem — e-commerce, affiliate earning, AI tools, crypto payments, and community crowdfunding. 
              Explore what&apos;s live now and what&apos;s launching soon.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/shop" className="btn-glow-purple bg-primary text-white px-8 py-3 rounded-full font-bold text-sm uppercase tracking-wider transition-all">
                🛒 Shop Now — Live
              </Link>
              <Link href="/register" className="btn-glow-cyan border-2 border-accent text-accent px-8 py-3 rounded-full font-bold text-sm uppercase tracking-wider hover:bg-accent hover:text-bg-base transition-all">
                ✨ Create Free Account
              </Link>
            </div>
          </div>

          {/* Status Legend */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {[
              { label: "Fully Live", color: "#4ADE80" },
              { label: "Partially Live", color: "#F59E0B" },
              { label: "Early Access Soon", color: "#00F0FF" },
              { label: "In Development", color: "#C084FC" },
              { label: "Coming Soon", color: "#5E17EB" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 text-xs text-fg-muted">
                <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                {s.label}
              </div>
            ))}
          </div>

          {/* Module Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
            {modules.map((mod) => (
              <ModuleCard key={mod.title} {...mod} />
            ))}
          </div>

          {/* Waitlist / Early Access */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-bg-card rounded-3xl p-8 border border-[rgba(94,23,235,0.2)] text-center relative overflow-hidden">
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(94,23,235,0.12) 0%, transparent 60%)" }}
                aria-hidden="true" />
              <div className="relative z-10">
                <div className="text-4xl mb-3">📬</div>
                <h2 className="text-2xl font-extrabold text-white mb-2">Get Early Access</h2>
                <p className="text-fg-muted text-sm mb-6">
                  Join the waitlist to be first in line when new features launch. Early access members get exclusive benefits.
                </p>
                {submitted ? (
                  <div className="p-4 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] rounded-2xl">
                    <p className="text-[#4ADE80] font-bold">✅ You&apos;re on the list!</p>
                    <p className="text-fg-muted text-xs mt-1">We&apos;ll notify you when early access opens.</p>
                  </div>
                ) : (
                  <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="your@email.com"
                      className="flex-1 bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-4 py-3 text-sm text-fg-base focus:outline-none focus:border-accent transition-all"
                    />
                    <button
                      type="submit"
                      className="btn-glow-purple bg-primary text-white font-bold px-6 py-3 rounded-xl text-sm transition-all flex-shrink-0">
                      Join Waitlist
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
