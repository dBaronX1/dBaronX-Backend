"use client";
import React, { useEffect, useRef } from "react";

const paymentCategories = [
  {
    icon: "💳",
    title: "All Fiat Methods",
    accent: "#00F0FF",
    items: [
      "Visa / Mastercard",
      "PayPal / Stripe",
      "Flutterwave",
      "M-Pesa",
      "Paystack",
      "Orange Money",
      "Regional Gateways",
    ],
  },
  {
    icon: "🔗",
    title: "All Crypto",
    accent: "#C084FC",
    items: [
      "Solana (SOL) / DBX Token",
      "Bitcoin (BTC)",
      "USDT / Stablecoins",
      
      "Binance Pay",
      "Coinbase Pay",
      "Future: DBX Pay",
    ],
  },
  {
    icon: "📱",
    title: "All Mobile Wallets",
    accent: "#4ADE80",
    items: [
      "Google Pay",
      "Apple Pay",
      "Flutterwave Mobile",
      "Regional Mobile Money",
      "Any wallet, anywhere",
    ],
  },
];

export default function PaymentRevolutionSection() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref?.current;
    if (!el) return;
    const items = el?.querySelectorAll(".reveal-up");
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.08 }
    );
    items?.forEach((i) => observer?.observe(i));
    return () => observer?.disconnect();
  }, []);

  return (
    <section id="payments" ref={ref} className="relative py-24 px-6 overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[500px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, rgba(94,23,235,0.15) 0%, transparent 70%)", filter: "blur(60px)" }}
        aria-hidden="true"
      />
      <div
        className="absolute right-0 top-0 w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,240,255,0.08) 0%, transparent 70%)", filter: "blur(80px)" }}
        aria-hidden="true"
      />
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16 space-y-6">
          <div className="reveal-up flex justify-center">
            <span className="tag-badge">Payment Revolution</span>
          </div>
          <h2 className="reveal-up text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            <span className="gradient-text-purple">dBaronX Payment Revolution</span>
            <br />
            <span className="text-white">– No One Left Behind</span>
          </h2>
          <p className="reveal-up text-fg-muted text-base md:text-lg max-w-3xl mx-auto leading-relaxed">
            Systematic exclusion based on location or nationality{" "}
            <span className="text-accent font-semibold">ends here</span>. Every medium of payment is accepted
            with minimum fees. Pay from anywhere with any method —{" "}
            <span className="text-[#4ADE80] font-semibold">zero blocks</span>.
          </p>
        </div>

        {/* Payment category cards */}
        <div className="reveal-up grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 stagger-children">
          {paymentCategories?.map((cat) => (
            <div
              key={cat?.title}
              className="card-hover-glow bg-bg-card rounded-3xl p-7 flex flex-col gap-5"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: `${cat?.accent}15`, border: `1px solid ${cat?.accent}30` }}
                >
                  {cat?.icon}
                </div>
                <h3 className="text-lg font-bold text-white">{cat?.title}</h3>
              </div>
              <ul className="flex flex-col gap-2">
                {cat?.items?.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-fg-muted">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cat?.accent }} />
                    {item}
                  </li>
                ))}
              </ul>
              <div
                className="h-px rounded-full mt-auto"
                style={{ background: `linear-gradient(90deg, ${cat?.accent}60, transparent)` }}
              />
            </div>
          ))}
        </div>

        {/* Smart routing banner */}
        <div className="reveal-up bg-gradient-to-r from-[rgba(94,23,235,0.25)] via-[rgba(0,240,255,0.08)] to-[rgba(94,23,235,0.25)] border border-[rgba(94,23,235,0.3)] rounded-3xl p-8 md:p-10">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: "rgba(0,240,255,0.1)", border: "1px solid rgba(0,240,255,0.25)" }}
            >
              🧠
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">Smart Payment Routing</h3>
              <p className="text-fg-muted text-sm leading-relaxed">
                Smart routing automatically detects your country and wallet and chooses the{" "}
                <span className="text-accent font-semibold">cheapest, fastest path</span>. No manual selection.
                No failed transactions. Just seamless global commerce — powered by the{" "}
                <span className="text-[#4ADE80] font-semibold">global dBaronX ecosystem</span>.
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="flex flex-col gap-1 text-center">
                <span className="shimmer-text text-3xl font-extrabold">∞</span>
                <span className="text-fg-muted text-xs font-mono uppercase tracking-widest">Methods</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
