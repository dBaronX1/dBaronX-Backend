"use client";
import React, { useEffect, useRef } from "react";

const SOLSCAN_URL = "https://solscan.io/token/4ZdL7df7KoDTyVqAnQ398ofsykqsox2S834KQBXNQNYE";

const channels = [
  {
    icon: "✈️",
    name: "Telegram",
    handle: "@dBaronX_DBX_Token",
    desc: "Join the global DBX community chat for live discussions, announcements, and AMA sessions.",
    href: "https://t.me/dBaronX_DBX_Token",
    accent: "#00F0FF",
    cta: "Join Telegram",
  },
  {
    icon: "🐦",
    name: "X (Twitter)",
    handle: "@dbaronx_eco",
    desc: "Follow for real-time updates, ecosystem news, and community highlights from the global dBaronX ecosystem.",
    href: "https://x.com/dbaronx_eco",
    accent: "#C084FC",
    cta: "Follow on X",
  },
  {
    icon: "📸",
    name: "Instagram",
    handle: "@dbaronx_official",
    desc: "Follow for product launches, ecosystem updates, and community highlights.",
    href: "https://www.instagram.com/dbaronx_official?igsh=bzh1NXNoMXd4YjB3",
    accent: "#F59E0B",
    cta: "Follow on Instagram",
  },
  {
    icon: "🔗",
    name: "Solscan",
    handle: "Token Verified",
    desc: "Verify the DBX token on-chain. Check supply, holders, and all token activity in real time.",
    href: SOLSCAN_URL,
    accent: "#4ADE80",
    cta: "View on Solscan",
  },
];

export default function CommunitySection() {
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
    <section id="community" ref={ref} className="relative py-24 px-6 overflow-hidden">
      {/* Big glow */}
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[400px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, rgba(94,23,235,0.12) 0%, transparent 70%)", filter: "blur(40px)" }}
        aria-hidden="true"
      />
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="reveal-up flex justify-center">
            <span className="tag-badge">Community & Get Started</span>
          </div>
          <h2 className="reveal-up text-4xl md:text-5xl font-extrabold tracking-tight">
            <span className="gradient-text-silver">Join the</span>{" "}
            <span className="gradient-text-purple">DBX Movement</span>
          </h2>
          <p className="reveal-up text-fg-muted max-w-xl mx-auto">
            Connect with holders worldwide, track your tokens on-chain, and be part of building a sustainable global future.
          </p>
        </div>

        {/* Channel cards */}
        <div className="reveal-up grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 stagger-children">
          {channels?.map((c) => (
            <a
              key={c?.name}
              href={c?.href}
              target="_blank"
              rel="noopener noreferrer"
              className="card-hover-glow bg-bg-card rounded-3xl p-7 flex flex-col gap-4 group no-underline"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `${c?.accent}15`, border: `1px solid ${c?.accent}30` }}
                >
                  {c?.icon}
                </div>
                <div>
                  <div className="font-bold text-white">{c?.name}</div>
                  <div
                    className="text-xs font-mono"
                    style={{ color: c?.accent }}
                  >
                    {c?.handle}
                  </div>
                </div>
              </div>
              <p className="text-fg-muted text-sm leading-relaxed">{c?.desc}</p>
              <div
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider mt-auto transition-all duration-200"
                style={{ color: c?.accent }}
              >
                {c?.cta}
                <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </a>
          ))}
        </div>

        {/* Final CTA banner */}
        <div className="reveal-up bg-gradient-to-r from-[rgba(94,23,235,0.3)] via-[rgba(0,240,255,0.1)] to-[rgba(94,23,235,0.3)] border border-[rgba(94,23,235,0.35)] rounded-4xl p-10 md:p-14 text-center space-y-6">
          <h3 className="text-3xl md:text-4xl font-extrabold text-white">
            Ready to hold{" "}
            <span className="gradient-text-purple">real utility?</span>
          </h3>
          <p className="text-fg-muted max-w-lg mx-auto">
            Verify DBX on Solscan, acquire tokens, and start earning rewards inside the global dBaronX ecosystem today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={SOLSCAN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-glow-purple bg-primary hover:bg-primary-light text-white px-8 py-4 rounded-full font-bold text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2"
            >
              Verify on Solscan
            </a>
            <a
              href="mailto:info@dbaronx.com"
              className="btn-glow-cyan bg-transparent border-2 border-accent text-accent hover:bg-accent hover:text-bg-base px-8 py-4 rounded-full font-bold text-sm uppercase tracking-wider transition-all duration-300 text-center"
            >
              Contact the Team
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}