"use client";
import React, { useEffect, useRef, useState } from "react";

const SOLSCAN_URL = "https://solscan.io/token/4ZdL7df7KoDTyVqAnQ398ofsykqsox2S834KQBXNQNYE";
const MINT_ADDRESS = "4ZdL7df7KoDTyVqAnQ398ofsykqsox2S834KQBXNQNYE";

const stats = [
  { label: "Symbol", value: "DBX", mono: true },
  { label: "Total Supply", value: "35,000,000", sub: "Strictly capped — no inflation" },
  { label: "Team Lock", value: "90% locked", sub: "Streamflow until Feb 2028" },
  { label: "Network", value: "Solana (SOL)", mono: false },
  { label: "Token Type", value: "SPL Utility Token", mono: false },
  { label: "Ecosystem", value: "Dubai / Ghana", mono: false },
];

export default function TokenDetailsSection() {
  const ref = useRef<HTMLElement>(null);
  const [copied, setCopied] = useState(false);

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

  const copyMint = () => {
    navigator.clipboard?.writeText(MINT_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="token" ref={ref} className="relative py-24 px-6 overflow-hidden">
      {/* Background accent */}
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,240,255,0.06) 0%, transparent 70%)", filter: "blur(60px)" }}
        aria-hidden="true"
      />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="reveal-up flex justify-center">
            <span className="tag-badge-cyan tag-badge">DBX Token Details</span>
          </div>
          <h2 className="reveal-up text-4xl md:text-5xl font-extrabold tracking-tight">
            <span className="gradient-text-silver">On-Chain</span>{" "}
            <span className="gradient-text-purple">Transparency</span>
          </h2>
          <p className="reveal-up text-fg-muted max-w-lg mx-auto">
            Every metric verifiable on-chain. No hidden allocations.
          </p>
        </div>

        {/* Stats grid */}
        <div className="reveal-up grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 stagger-children">
          {stats?.map((s) => (
            <div
              key={s?.label}
              className="card-hover-glow card-hover-glow-cyan bg-bg-card rounded-3xl p-7 flex flex-col gap-2"
            >
              <span className="text-fg-muted text-xs font-mono uppercase tracking-widest">
                {s?.label}
              </span>
              <span
                className={`text-2xl font-bold ${s?.mono ? "font-mono text-accent" : "text-white"}`}
              >
                {s?.value}
              </span>
              {s?.sub && <span className="text-fg-muted text-xs">{s?.sub}</span>}
            </div>
          ))}
        </div>

        {/* Mint address card */}
        <div className="reveal-up bg-bg-card border border-[rgba(0,240,255,0.15)] rounded-3xl p-7 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-fg-muted text-xs font-mono uppercase tracking-widest block mb-2">
                Mint Address
              </span>
              <span className="address-mono text-sm break-all">{MINT_ADDRESS}</span>
            </div>
            <button
              onClick={copyMint}
              className="flex-shrink-0 border border-accent text-accent hover:bg-accent hover:text-bg-base px-5 py-2.5 rounded-full text-xs font-bold font-mono uppercase tracking-wider transition-all duration-200"
            >
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* CTA */}
        <div className="reveal-up flex justify-center">
          <a
            href={SOLSCAN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-glow-cyan bg-transparent border-2 border-accent text-accent hover:bg-accent hover:text-bg-base px-10 py-4 rounded-full font-bold text-sm uppercase tracking-wider transition-all duration-300 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View Full Token Page on Solscan
          </a>
        </div>
      </div>
    </section>
  );
}