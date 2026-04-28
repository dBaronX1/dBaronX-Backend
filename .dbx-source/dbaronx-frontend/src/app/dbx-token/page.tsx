import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";

const DBX_MINT = "4ZdL7df7KoDTyVqAnQ398ofsykqsox2S834KQBXNQNYE";
const SOLSCAN_URL = `https://solscan.io/token/${DBX_MINT}`;
const STREAMFLOW_URL = "https://streamflow.finance";
const CREATION_TX = "https://solscan.io/tx/5EGKUEA9kLzTzeKCEyBjzVYi34zBtiauepjo23TAv2Y9MNDSoWTYduF4iau7q93sLZ15DfWs6yghK33gFtn6mZ7X";

const tokenStats = [
  { label: "Symbol", value: "DBX", mono: true },
  { label: "Total Supply", value: "35,000,000", sub: "Strictly capped — no inflation" },
  { label: "Team Lock", value: "90% Locked", sub: "Streamflow until Feb 2028" },
  { label: "Blockchain", value: "Solana", sub: "Fast, low-fee, eco-efficient" },
  { label: "Decimals", value: "9", mono: true },
  { label: "Status", value: "Live", sub: "Verified on Solscan" },
];

const tokenomics = [
  { label: "Community & Ecosystem", pct: 40, color: "#00F0FF" },
  { label: "Team (90% locked until 2028)", pct: 20, color: "#5E17EB" },
  { label: "Staking Rewards", pct: 15, color: "#22C55E" },
  { label: "Crowdfunding Reserve", pct: 10, color: "#C084FC" },
  { label: "Marketing & Partnerships", pct: 10, color: "#F59E0B" },
  { label: "Liquidity Pool", pct: 5, color: "#EC4899" },
];

const useCases = [
  { icon: "🛒", title: "Shop Payments", desc: "Pay for eco-products with DBX and get 15% extra discount" },
  { icon: "🌱", title: "Crowdfunding", desc: "Back campaigns and receive DBX as reward tiers" },
  { icon: "⭐", title: "Loyalty Points", desc: "Earn DBX by watching ads and completing platform tasks" },
  { icon: "🤝", title: "Affiliate Rewards", desc: "10% commission paid in DBX or USDC" },
  { icon: "🔒", title: "Staking", desc: "Stake DBX to earn passive rewards (coming soon)" },
  { icon: "🗳️", title: "Governance", desc: "Vote on platform decisions with DBX holdings (coming soon)" },
];

export default function DBXTokenPage() {
  return (
    <div className="min-h-screen bg-bg-base circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        <div className="max-w-7xl mx-auto px-4">
          {/* Hero */}
          <div className="text-center py-16">
            <span className="tag-badge-cyan mb-4 inline-block">Solana Utility Token</span>
            <h1 className="text-5xl md:text-6xl font-bold gradient-text-purple mb-4">DBX Token</h1>
            <p className="text-fg-muted max-w-2xl mx-auto text-lg mb-8">
              The utility token powering the global dBaronX eco-commerce ecosystem. Strictly capped at 35,000,000 — no inflation, ever.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href={SOLSCAN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-glow-cyan bg-transparent border border-accent text-accent px-8 py-3 rounded-full font-bold hover:bg-accent hover:text-bg-base transition-all"
              >
                View on Solscan ↗
              </a>
              <a
                href={CREATION_TX}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-glow-purple bg-primary text-white px-8 py-3 rounded-full font-bold hover:bg-primary-light transition-all"
              >
                Verify Mint History ↗
              </a>
            </div>
          </div>

          {/* Mint Address */}
          <div className="bg-bg-card rounded-2xl border border-accent/20 p-6 mb-12 text-center">
            <p className="text-xs text-fg-muted mb-2 font-mono uppercase tracking-wider">Mint Address</p>
            <p className="address-mono text-sm md:text-base break-all">{DBX_MINT}</p>
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              <a href={SOLSCAN_URL} target="_blank" rel="noopener noreferrer" className="tag-badge-cyan text-xs hover:opacity-80 transition-opacity">View on Solscan ↗</a>
              <a href={STREAMFLOW_URL} target="_blank" rel="noopener noreferrer" className="tag-badge text-xs hover:opacity-80 transition-opacity">Streamflow Lock ↗</a>
              <a href={CREATION_TX} target="_blank" rel="noopener noreferrer" className="tag-badge-green text-xs hover:opacity-80 transition-opacity">Creation TX ↗</a>
            </div>
          </div>

          {/* Token Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
            {tokenStats?.map((stat, i) => (
              <div key={i} className="card-hover-glow bg-bg-card rounded-2xl p-5">
                <p className="text-xs text-fg-muted mb-1">{stat?.label}</p>
                <p className={`text-xl font-bold text-fg-base ${stat?.mono ? "font-mono text-accent" : ""}`}>{stat?.value}</p>
                {stat?.sub && <p className="text-xs text-fg-muted mt-1">{stat?.sub}</p>}
              </div>
            ))}
          </div>

          {/* Tokenomics */}
          <div className="bg-bg-card rounded-2xl border border-[rgba(94,23,235,0.2)] p-8 mb-12">
            <h2 className="text-2xl font-bold text-fg-base mb-6 text-center">Tokenomics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Visual bars */}
              <div className="space-y-4">
                {tokenomics?.map((t, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-fg-muted">{t?.label}</span>
                      <span className="font-bold" style={{ color: t?.color }}>{t?.pct}%</span>
                    </div>
                    <div className="h-2 bg-bg-base rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${t?.pct}%`, backgroundColor: t?.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {/* Key facts */}
              <div className="space-y-4">
                <div className="bg-bg-base rounded-xl p-4 border border-[rgba(94,23,235,0.15)]">
                  <p className="text-xs text-fg-muted mb-1">Total Supply</p>
                  <p className="text-2xl font-bold shimmer-text">35,000,000 DBX</p>
                  <p className="text-xs text-eco-green mt-1">✓ Hard cap — no minting ever</p>
                </div>
                <div className="bg-bg-base rounded-xl p-4 border border-[rgba(94,23,235,0.15)]">
                  <p className="text-xs text-fg-muted mb-1">Team Allocation Lock</p>
                  <p className="text-lg font-bold text-primary-light">90% locked until Feb 2028</p>
                  <p className="text-xs text-fg-muted mt-1">Via Streamflow — verifiable on-chain</p>
                </div>
                <div className="bg-bg-base rounded-xl p-4 border border-[rgba(94,23,235,0.15)]">
                  <p className="text-xs text-fg-muted mb-1">Blockchain</p>
                  <p className="text-lg font-bold text-accent">Solana</p>
                  <p className="text-xs text-fg-muted mt-1">~400ms finality, $0.00025 avg fee</p>
                </div>
              </div>
            </div>
          </div>

          {/* Use Cases */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-fg-base mb-6 text-center">DBX Utility</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {useCases?.map((uc, i) => (
                <div key={i} className="card-hover-glow bg-bg-card rounded-2xl p-5">
                  <div className="text-3xl mb-3">{uc?.icon}</div>
                  <h3 className="font-bold text-fg-base mb-1">{uc?.title}</h3>
                  <p className="text-xs text-fg-muted">{uc?.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Transparency */}
          <div className="bg-bg-card rounded-2xl border border-eco-green/20 p-8 mb-12">
            <h2 className="text-2xl font-bold text-fg-base mb-6 text-center">Transparency & Proof</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: "Mint Address", value: DBX_MINT, link: SOLSCAN_URL, truncate: true },
                { label: "Creation Transaction", value: CREATION_TX, link: CREATION_TX, truncate: true },
                { label: "Team Lock Proof", value: "90% locked on Streamflow until February 2028", link: STREAMFLOW_URL },
                { label: "Total Supply", value: "35,000,000 DBX — strictly capped, no inflation possible", link: SOLSCAN_URL },
              ]?.map((item, i) => (
                <div key={i} className="bg-bg-base rounded-xl p-4 border border-[rgba(94,23,235,0.15)]">
                  <p className="text-xs text-fg-muted mb-1">{item?.label}</p>
                  <p className={`text-xs font-mono text-accent ${item?.truncate ? "truncate" : ""}`}>{item?.value}</p>
                  <a href={item?.link} target="_blank" rel="noopener noreferrer" className="text-xs text-eco-green hover:underline mt-1 block">Verify on-chain ↗</a>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="text-center">
            <h2 className="text-2xl font-bold gradient-text-purple mb-4">Ready to Join the Ecosystem?</h2>
            <p className="text-fg-muted mb-6">Create your account, earn DBX, and be part of the global eco-commerce revolution.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/register" className="btn-glow-purple bg-primary text-white font-bold px-8 py-3 rounded-full hover:bg-primary-light transition-all">
                Create Account
              </Link>
              <Link href="/shop" className="btn-glow-cyan bg-transparent border border-accent text-accent font-bold px-8 py-3 rounded-full hover:bg-accent hover:text-bg-base transition-all">
                Visit Shop
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
