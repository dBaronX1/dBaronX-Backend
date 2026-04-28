"use client";
import React, { useEffect, useRef, useState } from "react";

const SOLSCAN_URL = "https://solscan.io/token/4ZdL7df7KoDTyVqAnQ398ofsykqsox2S834KQBXNQNYE";
const CREATION_TX = "https://solscan.io/tx/5EGKUEA9kLzTzeKCEyBjzVYi34zBtiauepjo23TAv2Y9MNDSoWTYduF4iau7q93sLZ15DfWs6yghK33gFtn6mZ7X";
const MINT_ADDRESS = "4ZdL7df7KoDTyVqAnQ398ofsykqsox2S834KQBXNQNYE";

const proofCards = [
  {
    icon: "🔑",
    label: "Mint Address",
    value: MINT_ADDRESS,
    isAddress: true,
    accent: "#00F0FF",
    href: SOLSCAN_URL,
  },
  {
    icon: "⛓️",
    label: "Creation Transaction",
    value: "5EGKUEA9kLzTze...Ftn6mZ7X",
    isAddress: true,
    accent: "#C084FC",
    href: CREATION_TX,
  },
  {
    icon: "📊",
    label: "Total Supply",
    value: "35,000,000 DBX",
    sub: "Strictly capped — no inflation, ever",
    accent: "#00F0FF",
    href: null,
  },
  {
    icon: "🔒",
    label: "Team Allocation Lock",
    value: "90% Locked",
    sub: "On Streamflow until February 2028",
    accent: "#4ADE80",
    href: null,
  },
];

export default function TransparencySection() {
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
    <section id="transparency" ref={ref} className="relative py-24 px-6 overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-0 w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(0,240,255,0.06) 0%, transparent 70%)", filter: "blur(60px)" }}
        aria-hidden="true"
      />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="reveal-up flex justify-center">
            <span className="tag-badge-cyan tag-badge">Transparency & Proof</span>
          </div>
          <h2 className="reveal-up text-4xl md:text-5xl font-extrabold tracking-tight">
            <span className="gradient-text-silver">On-Chain</span>{" "}
            <span className="gradient-text-purple">Verified</span>
          </h2>
          <p className="reveal-up text-fg-muted max-w-xl mx-auto">
            Every claim is backed by immutable on-chain proof. Verify everything yourself — no trust required.
          </p>
        </div>

        {/* Proof cards grid */}
        <div className="reveal-up grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 stagger-children">
          {proofCards?.map((card) => (
            <div
              key={card?.label}
              className="card-hover-glow bg-bg-card rounded-3xl p-7 flex flex-col gap-3"
              style={{ borderColor: `${card?.accent}20` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: `${card?.accent}15`, border: `1px solid ${card?.accent}30` }}
                >
                  {card?.icon}
                </div>
                <span className="text-fg-muted text-xs font-mono uppercase tracking-widest">{card?.label}</span>
              </div>
              {card?.isAddress ? (
                <div className="flex flex-col gap-2">
                  <span className="address-mono text-xs break-all" style={{ color: card?.accent }}>
                    {card?.label === "Mint Address" ? MINT_ADDRESS : card?.value}
                  </span>
                  {card?.href && (
                    <a
                      href={card?.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider transition-colors hover:opacity-80"
                      style={{ color: card?.accent }}
                    >
                      View on Solscan
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              ) : (
                <div>
                  <span className="text-2xl font-bold text-white block">{card?.value}</span>
                  {card?.sub && <span className="text-fg-muted text-xs mt-1 block">{card?.sub}</span>}
                </div>
              )}
              <div
                className="h-px rounded-full mt-auto"
                style={{ background: `linear-gradient(90deg, ${card?.accent}60, transparent)` }}
              />
            </div>
          ))}
        </div>

        {/* Copy mint + CTA row */}
        <div className="reveal-up bg-bg-card border border-[rgba(0,240,255,0.12)] rounded-3xl p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-fg-muted text-xs font-mono uppercase tracking-widest block mb-1">Quick Copy — Mint Address</span>
              <span className="address-mono text-sm break-all text-accent">{MINT_ADDRESS}</span>
            </div>
            <button
              onClick={copyMint}
              className="flex-shrink-0 border border-accent text-accent hover:bg-accent hover:text-bg-base px-5 py-2.5 rounded-full text-xs font-bold font-mono uppercase tracking-wider transition-all duration-200"
            >
              {copied ? "✓ Copied!" : "Copy Address"}
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
