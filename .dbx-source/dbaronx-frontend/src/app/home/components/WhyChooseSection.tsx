"use client";
import React, { useEffect, useRef } from "react";

const trustPoints = [
  {
    icon: "🔒",
    title: "90% Team Tokens Locked",
    desc: "Verified on Streamflow until February 2028. No silent dumps. Full commitment documented on-chain.",
    accent: "#4ADE80",
  },
  {
    icon: "📊",
    title: "Strictly Capped Supply",
    desc: "35,000,000 DBX total — ever. No inflation mechanism. No surprise minting. Scarcity by design.",
    accent: "#00F0FF",
  },
  {
    icon: "⛓️",
    title: "Transparent Blockchain",
    desc: "Every transaction, every allocation, every lock — all verifiable on Solscan in real time.",
    accent: "#C084FC",
  },
  {
    icon: "🌱",
    title: "Eco-Impact Focus",
    desc: "Not just another token. DBX funds recycling programs, sustainable farms, and community livelihoods.",
    accent: "#4ADE80",
  },
  {
    icon: "🛒",
    title: "Real Product Utility",
    desc: "Spend DBX on actual natural health products and eco-goods. Not just speculation — real purchasing power.",
    accent: "#F59E0B",
  },
  {
    icon: "🌐",
    title: "Global Ecosystem",
    desc: "The global dBaronX ecosystem bridges communities worldwide — connecting buyers, sellers, and stakers across every continent.",
    accent: "#5E17EB",
  },
];

export default function WhyChooseSection() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref?.current;
    if (!el) return;
    const items = el?.querySelectorAll(".reveal-up");
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.1 }
    );
    items?.forEach((i) => observer?.observe(i));
    return () => observer?.disconnect();
  }, []);

  return (
    <section id="why" ref={ref} className="relative py-24 px-6 overflow-hidden">
      <div
        className="absolute right-1/4 top-0 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,240,255,0.05) 0%, transparent 70%)", filter: "blur(80px)" }}
        aria-hidden="true"
      />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="grid lg:grid-cols-2 gap-16 items-end mb-16">
          <div className="space-y-5">
            <div className="reveal-up">
              <span className="tag-badge">Why DBX</span>
            </div>
            <h2 className="reveal-up text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
              <span className="text-white">Built Different.</span>
              <br />
              <span className="gradient-text-purple">Trusted by Design.</span>
            </h2>
          </div>
          <p className="reveal-up text-fg-muted text-base leading-relaxed">
            In a market full of promises, DBX backs every claim with on-chain proof.
            Real locks, real products, real impact — not just a whitepaper.
          </p>
        </div>

        {/* Trust grid */}
        <div className="reveal-up grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
          {trustPoints?.map((p) => (
            <div
              key={p?.title}
              className="card-hover-glow bg-bg-card rounded-3xl p-7 flex flex-col gap-4 group"
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-transform duration-300 group-hover:scale-110"
                style={{ background: `${p?.accent}15`, border: `1px solid ${p?.accent}30` }}
              >
                {p?.icon}
              </div>
              <h3 className="text-lg font-bold text-white">{p?.title}</h3>
              <p className="text-fg-muted text-sm leading-relaxed">{p?.desc}</p>
              <div
                className="h-px rounded-full mt-auto"
                style={{ background: `linear-gradient(90deg, ${p?.accent}50, transparent)` }}
              />
            </div>
          ))}
        </div>

        {/* Big stat bar */}
        <div className="reveal-up mt-8 bg-bg-card border border-[rgba(94,23,235,0.2)] rounded-3xl p-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { val: "35M", label: "Capped Supply" },
            { val: "90%", label: "Team Locked" },
            { val: "Feb '28", label: "Lock Expiry" },
            { val: "SOL", label: "Network" },
          ]?.map((s) => (
            <div key={s?.label} className="flex flex-col gap-1">
              <span className="shimmer-text text-3xl font-extrabold">{s?.val}</span>
              <span className="text-fg-muted text-xs font-mono uppercase tracking-widest">{s?.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}