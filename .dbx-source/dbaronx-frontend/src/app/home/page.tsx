import React from "react";
import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ParticleBackground from "./components/ParticleBackground";
import HeroSection from "./components/HeroSection";
import TeaserProductsSection from "./components/TeaserProductsSection";
import EcosystemSection from "./components/EcosystemSection";
import CommunitySection from "./components/CommunitySection";
import Link from "next/link";

export const metadata: Metadata = {
  title: "dBaronX — Premium Global E-Commerce",
  description:
  "Shop premium products worldwide with dBaronX. Secure payments, verified suppliers, global shipping. Pay first — we handle the rest. Create your free account today.",
  openGraph: {
    title: "dBaronX — Premium Global E-Commerce",
    description: "Shop premium products worldwide. Secure payments, verified suppliers, global shipping. Pay first — we handle the rest.",
    images: [{ url: "https://img.rocket.new/generatedImages/rocket_gen_img_11fe1060c-1773965721888.png", width: 1200, height: 630, alt: "dBaronX Premium E-Commerce Platform" }]
  }
};

const SCHEMA_PRODUCTS = {
  "@context": "https://schema.org",
  "@type": "Store",
  "name": "dBaronX Shop",
  "description": "Premium global e-commerce with verified suppliers and secure payments",
  "url": "https://dbaronx.com/shop"
};

export default function HomePage() {
  return (
    <main className="relative bg-bg-base min-h-screen overflow-x-hidden" id="main-content">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA_PRODUCTS) }} />

      <ParticleBackground />
      <Header />
      <HeroSection />

      {/* Trust & Value Proposition */}
      <div className="neon-line mx-6 md:mx-16" aria-hidden="true" />
      <section className="py-16 px-6" aria-labelledby="trust-section-title">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 id="trust-section-title" className="text-3xl md:text-4xl font-extrabold text-white mb-3">
              Why Shop with <span className="gradient-text-purple">dBaronX</span>?
            </h2>
            <p className="text-fg-muted max-w-xl mx-auto text-sm">
              A premium dropshipping model built on trust, transparency, and real customer protection.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
            {
              icon: "🔒",
              title: "Pay-First Protection",
              desc: "Your payment is confirmed before any order is placed with suppliers. Zero risk of unfulfilled orders.",
              accent: "#00F0FF"
            },
            {
              icon: "🌍",
              title: "Global Supplier Network",
              desc: "Curated suppliers worldwide. Products ship directly to your door from verified sources.",
              accent: "#4ADE80"
            },
            {
              icon: "💎",
              title: "DBX Member Discounts",
              desc: "Hold DBX tokens and unlock exclusive discounts on every purchase across the store.",
              accent: "#C084FC"
            },
            {
              icon: "📦",
              title: "Direct-to-Door Shipping",
              desc: "Suppliers ship directly to your address. No warehouse middleman. Faster delivery.",
              accent: "#F59E0B"
            },
            {
              icon: "✅",
              title: "Admin-Verified Orders",
              desc: "Every order is reviewed and approved before fulfillment. Human oversight on every transaction.",
              accent: "#00F0FF"
            },
            {
              icon: "🤝",
              title: "Transparent Process",
              desc: "You always know where your order stands. Track status from payment to delivery.",
              accent: "#4ADE80"
            }].
            map((item) =>
            <div
              key={item.title}
              className="card-hover-glow bg-bg-card rounded-2xl p-6 border border-[rgba(94,23,235,0.15)] flex flex-col gap-3">
                <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ background: `${item.accent}15`, border: `1px solid ${item.accent}30` }}>
                  {item.icon}
                </div>
                <h3 className="font-bold text-white text-sm">{item.title}</h3>
                <p className="text-fg-muted text-xs leading-relaxed">{item.desc}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <div className="neon-line mx-6 md:mx-16" aria-hidden="true" />
      <TeaserProductsSection />

      {/* How Ordering Works */}
      <div className="neon-line mx-6 md:mx-16" aria-hidden="true" />
      <section className="py-16 px-6" aria-labelledby="how-it-works-title">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="tag-badge inline-flex items-center gap-1 mb-4">
              <span aria-hidden="true">📋</span> How It Works
            </div>
            <h2 id="how-it-works-title" className="text-3xl md:text-4xl font-extrabold text-white mb-3">
              Simple. Secure. <span className="gradient-text-purple">Straightforward.</span>
            </h2>
            <p className="text-fg-muted max-w-xl mx-auto text-sm">
              Our semi-automatic fulfillment model puts you first. Here&apos;s exactly how your order flows from cart to doorstep.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
            {
              step: "01",
              icon: "🛍️",
              title: "Browse & Add to Cart",
              desc: "Explore our curated product catalog. Add items to your cart and proceed to checkout.",
              accent: "#5E17EB"
            },
            {
              step: "02",
              icon: "💳",
              title: "Pay Securely",
              desc: "Complete payment via Stripe, Paystack, crypto, or bank transfer. Your payment is secured first.",
              accent: "#00F0FF"
            },
            {
              step: "03",
              icon: "✅",
              title: "We Review & Order",
              desc: "dBaronX confirms your payment, then places the order with our verified supplier network.",
              accent: "#4ADE80"
            },
            {
              step: "04",
              icon: "📦",
              title: "Ships to Your Door",
              desc: "Supplier ships directly to your address. You receive tracking info and delivery confirmation.",
              accent: "#C084FC"
            }].
            map((item, i) =>
            <div key={item.step} className="relative">
                {i < 3 &&
              <div className="hidden lg:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-[rgba(94,23,235,0.4)] to-transparent z-10" aria-hidden="true" />
              }
                <div className="bg-bg-card rounded-2xl p-6 border border-[rgba(94,23,235,0.15)] flex flex-col gap-3 h-full">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.icon}</span>
                    <span className="text-xs font-mono font-bold" style={{ color: item.accent }}>{item.step}</span>
                  </div>
                  <h3 className="font-bold text-white text-sm">{item.title}</h3>
                  <p className="text-fg-muted text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            )}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/shop"
              className="btn-glow-purple bg-primary hover:bg-primary-light text-white px-10 py-4 rounded-full font-bold text-sm uppercase tracking-wider transition-all duration-300 inline-flex items-center gap-2">
              <span aria-hidden="true">🛒</span> Start Shopping
            </Link>
          </div>
        </div>
      </section>

      {/* Register CTA Banner */}
      <div className="neon-line mx-6 md:mx-16" aria-hidden="true" />
      <section className="py-16 px-6" aria-labelledby="register-cta-title">
        <div className="max-w-4xl mx-auto">
          <div className="bg-bg-card rounded-3xl p-8 md:p-12 border border-[rgba(94,23,235,0.2)] relative overflow-hidden text-center">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(94,23,235,0.15) 0%, transparent 60%)" }}
              aria-hidden="true" />
            <div className="relative z-10">
              <div className="tag-badge inline-flex items-center gap-1 mb-4">
                <span aria-hidden="true">🎁</span> Free Account Benefits
              </div>
              <h2 id="register-cta-title" className="text-3xl md:text-4xl font-extrabold text-white mb-4">
                Join <span className="gradient-text-purple">dBaronX</span> Free Today
              </h2>
              <p className="text-fg-muted mb-8 max-w-xl mx-auto text-sm leading-relaxed">
                Create your free account to access exclusive member pricing, order tracking, referral rewards, and early access to new products and platform features.
              </p>
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {["Order Tracking", "Member Discounts", "Referral Rewards", "Early Access", "DBX Benefits"].map((benefit) =>
                <span key={benefit} className="text-xs text-[#4ADE80] bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] px-3 py-1.5 rounded-full font-medium">
                    ✓ {benefit}
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/register"
                  className="btn-glow-purple bg-primary hover:bg-primary-light text-white px-10 py-4 rounded-full font-bold text-sm uppercase tracking-wider transition-all duration-300 inline-flex items-center gap-2">
                  <span aria-hidden="true">✨</span> Create Free Account
                </Link>
                <Link
                  href="/login"
                  className="border border-[rgba(94,23,235,0.4)] text-[#C084FC] px-10 py-4 rounded-full font-bold text-sm uppercase tracking-wider hover:bg-[rgba(94,23,235,0.1)] transition-all inline-flex items-center gap-2">
                  <span aria-hidden="true">→</span> Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ecosystem Section */}
      <div className="neon-line mx-6 md:mx-16" aria-hidden="true" />
      <EcosystemSection />

      {/* Telegram CTA */}
      <div className="neon-line mx-6 md:mx-16" aria-hidden="true" />
      <section className="py-16 px-6" aria-labelledby="telegram-cta-title">
        <div className="max-w-4xl mx-auto text-center">
          <div className="tag-badge inline-flex items-center gap-1 mb-4">
            <span aria-hidden="true">🤖</span> Telegram Bot
          </div>
          <h2 id="telegram-cta-title" className="text-3xl font-extrabold text-white mb-3">
            Shop & Track via Telegram
          </h2>
          <p className="text-fg-muted mb-8 max-w-xl mx-auto">
            Browse products, track orders, check affiliate earnings — all from Telegram. No app download needed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={process.env.NEXT_PUBLIC_TELEGRAM_BOT_LINK || "https://t.me/dBaronX_DBX_Token"}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glow-cyan inline-flex items-center gap-2 bg-transparent border-2 border-accent text-accent px-8 py-4 rounded-full font-bold text-sm uppercase tracking-wider hover:bg-accent hover:text-bg-base transition-all focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label="Open dBaronX in Telegram">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Open in Telegram
            </a>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 border border-[rgba(94,23,235,0.4)] text-[#C084FC] px-8 py-4 rounded-full font-bold text-sm uppercase tracking-wider hover:bg-[rgba(94,23,235,0.1)] transition-all focus:outline-none focus:ring-2 focus:ring-accent">
              <span aria-hidden="true">🛒</span> Browse Shop
            </Link>
          </div>
        </div>
      </section>

      <div className="neon-line mx-6 md:mx-16" aria-hidden="true" />
      <CommunitySection />

      <Footer />
    </main>);

}