"use client";
import React, { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function WalletPage() {
  const [copied, setCopied] = useState(false);
  const DBX_MINT = "4ZdL7df7KoDTyVqAnQ398ofsykqsox2S834KQBXNQNYE";

  const copyMint = () => {
    navigator.clipboard?.writeText(DBX_MINT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#050510] circuit-bg">
      <Header />
      <main className="pt-20 pb-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="py-10">
            <span className="tag-badge mb-3 inline-block">DBX Wallet</span>
            <h1 className="text-3xl font-extrabold text-white mb-2">Your <span className="gradient-text-purple">Wallet</span></h1>
            <p className="text-[#9090BB] text-sm">Manage your DBX tokens, earnings, and payment methods.</p>
          </div>

          {/* Balance Cards */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {[
              { label: "DBX Balance", value: "—", sub: "Connect wallet to view", icon: "💎", color: "#C084FC" },
              { label: "Earnings Balance", value: "—", sub: "Watch-to-earn + affiliate", icon: "💰", color: "#22C55E" },
              { label: "Pending Payout", value: "—", sub: "Awaiting confirmation", icon: "⏳", color: "#F59E0B" },
            ]?.map((card) => (
              <div key={card?.label} className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{card?.icon}</span>
                  <span className="text-xs text-[#9090BB] font-mono">Live</span>
                </div>
                <p className="text-2xl font-bold text-white">{card?.value}</p>
                <p className="text-xs text-[#9090BB] mt-1">{card?.label}</p>
                <p className="text-[10px] text-[#9090BB] mt-0.5">{card?.sub}</p>
              </div>
            ))}
          </div>

          {/* Wallet Connect */}
          <div className="bg-gradient-to-br from-[rgba(94,23,235,0.1)] to-[rgba(0,240,255,0.05)] border border-[rgba(94,23,235,0.3)] rounded-2xl p-6 mb-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white mb-1">Connect Solana Wallet</h2>
                <p className="text-xs text-[#9090BB]">Connect your Phantom, Solflare, or other Solana wallet to view DBX balance and make crypto payments.</p>
              </div>
              <button className="btn-glow-purple bg-[#5E17EB] hover:bg-[#7B3FF5] text-white px-6 py-3 rounded-full font-bold text-sm whitespace-nowrap transition-all">
                Connect Wallet
              </button>
            </div>
          </div>

          {/* DBX Token Info */}
          <div className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl p-6 mb-6">
            <h2 className="text-base font-bold text-white mb-4">DBX Token</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-[rgba(94,23,235,0.1)]">
                <span className="text-xs text-[#9090BB]">Mint Address</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#00F0FF] truncate max-w-[180px]">{DBX_MINT}</span>
                  <button onClick={copyMint} className="text-xs text-[#9090BB] hover:text-white transition-colors">
                    {copied ? "✓" : "Copy"}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[rgba(94,23,235,0.1)]">
                <span className="text-xs text-[#9090BB]">Network</span>
                <span className="text-xs text-white">Solana Mainnet</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-[#9090BB]">Total Supply</span>
                <span className="text-xs text-white font-semibold">35,000,000 DBX</span>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <a href={`https://solscan.io/token/${DBX_MINT}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#00F0FF] bg-[rgba(0,240,255,0.08)] border border-[rgba(0,240,255,0.2)] px-4 py-2 rounded-full hover:bg-[rgba(0,240,255,0.12)] transition-colors">
                View on Solscan ↗
              </a>
              <Link href="/dbx-token" className="text-xs text-[#C084FC] bg-[rgba(192,132,252,0.08)] border border-[rgba(192,132,252,0.2)] px-4 py-2 rounded-full hover:bg-[rgba(192,132,252,0.12)] transition-colors">
                Token Details →
              </Link>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-[#0D0D2B] border border-[rgba(94,23,235,0.2)] rounded-2xl p-6">
            <h2 className="text-base font-bold text-white mb-4">Payment & Payout Methods</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {[
                { icon: "🏦", name: "Bank Transfer", status: "Available", color: "#22C55E" },
                { icon: "📱", name: "Mobile Money", status: "Available", color: "#22C55E" },
                { icon: "💳", name: "Stripe", status: "Available", color: "#22C55E" },
                { icon: "🇳🇬", name: "Paystack", status: "Available", color: "#22C55E" },
                { icon: "🔷", name: "Crypto / USDT", status: "Available", color: "#22C55E" },
                { icon: "💎", name: "DBX Token", status: "Coming Soon", color: "#F59E0B" },
              ]?.map((method) => (
                <div key={method?.name} className="flex items-center justify-between bg-[#050510] border border-[rgba(94,23,235,0.1)] rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{method?.icon}</span>
                    <span className="text-sm text-white">{method?.name}</span>
                  </div>
                  <span className="text-xs font-medium" style={{ color: method?.color }}>{method?.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
