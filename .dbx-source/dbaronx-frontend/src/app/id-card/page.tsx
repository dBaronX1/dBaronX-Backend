"use client";
import React, { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import OpenInBotButton from "@/components/OpenInBotButton";

interface ShippingOption {
  id: string;
  name: string;
  type: string;
  country: string;
  city: string;
  address: string;
  instructions: string;
}

const DBX_MERCHANT_WALLET = "4ZdL7df7KoDTyVqAnQ398ofsykqsox2S834KQBXNQNYE";

const TYPE_ICONS: Record<string, string> = {
  post_office: "📮",
  parcel_locker: "📦",
  security_center: "🔒",
};

const TYPE_LABELS: Record<string, string> = {
  post_office: "Post Office",
  parcel_locker: "Parcel Locker",
  security_center: "Security Centre",
};

export default function IDCardPage() {
  const { user } = useAuth();
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [loading, setLoading] = useState(true);
  const [cardGenerated, setCardGenerated] = useState(false);
  const [dbxBalance, setDbxBalance] = useState<number | null>(null);
  const [phantomAddress, setPhantomAddress] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchShippingOptions();
  }, []);

  const fetchShippingOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("shipping_options")
        .select("*")
        .eq("is_active", true)
        .order("country", { ascending: true });
      if (error) { console.log("Shipping error:", error.message); return; }
      setShippingOptions(data || []);
    } finally {
      setLoading(false);
    }
  };

  const connectPhantom = async () => {
    try {
      const win = window as Window & { solana?: { connect: () => Promise<{ publicKey: { toString: () => string } }>; isPhantom?: boolean } };
      if (!win.solana?.isPhantom) {
        window.open("https://phantom.app", "_blank");
        return;
      }
      const resp = await win.solana.connect();
      setPhantomAddress(resp.publicKey.toString());
    } catch (e) {
      console.log("Phantom connect error:", e);
    }
  };

  const countries = ["all", ...Array.from(new Set(shippingOptions.map((o) => o.country)))];
  const filtered = selectedCountry === "all"
    ? shippingOptions
    : shippingOptions.filter((o) => o.country === selectedCountry);

  return (
    <main className="relative bg-bg-base min-h-screen" id="main-content">
      <Header />

      <div className="pt-24 pb-20 px-6">
        <div className="max-w-5xl mx-auto">

          {/* Page Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 tag-badge mb-4">
              <span aria-hidden="true">🪪</span> DBX Premium ID Card
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
              <span className="gradient-text-purple">Anonymous Shipping</span>
              <span className="text-white block mt-1">& Premium ID Card</span>
            </h1>
            <p className="text-fg-muted text-lg max-w-2xl mx-auto mb-6">
              No home address required. Pick up from post offices, parcel lockers, or security centres worldwide. DBX holders get premium ID cards with Solana Pay QR for instant discounts.
            </p>
            <div className="flex justify-center">
              <OpenInBotButton page="id-card" size="md" variant="outline" label="Wallet in Bot" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Anonymous Shipping Section */}
            <section aria-labelledby="shipping-title">
              <div className="bg-bg-card rounded-3xl p-6 border border-[rgba(94,23,235,0.2)] h-full">
                <h2 id="shipping-title" className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <span aria-hidden="true">📮</span> Hustle-Free Pickup Points
                </h2>
                <p className="text-fg-muted text-sm mb-5">
                  Select your country and choose a pickup point. No home address needed — just show your order QR at collection.
                </p>

                {/* Country Filter */}
                <div className="flex flex-wrap gap-2 mb-5" role="group" aria-label="Filter by country">
                  {countries.map((c) => (
                    <button
                      key={c}
                      onClick={() => setSelectedCountry(c)}
                      aria-pressed={selectedCountry === c}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-accent ${
                        selectedCountry === c
                          ? "bg-primary text-white" :"bg-bg-card2 text-fg-muted hover:text-accent border border-[rgba(94,23,235,0.2)]"
                      }`}
                    >
                      {c === "all" ? "🌍 All" : c}
                    </button>
                  ))}
                </div>

                {/* Shipping Options */}
                {loading ? (
                  <div className="space-y-3" aria-busy="true" aria-label="Loading shipping options">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-20 bg-bg-card2 rounded-xl animate-pulse" aria-hidden="true" />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="text-fg-muted text-sm text-center py-8">No pickup points available for this region yet.</p>
                ) : (
                  <div className="space-y-3" role="list" aria-label="Available pickup points">
                    {filtered.map((opt) => (
                      <div
                        key={opt.id}
                        role="listitem"
                        className="bg-bg-card2 rounded-xl p-4 border border-[rgba(255,255,255,0.04)] hover:border-[rgba(94,23,235,0.3)] transition-all"
                        aria-label={`${opt.name} in ${opt.city}, ${opt.country}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-xl flex-shrink-0" aria-hidden="true">{TYPE_ICONS[opt.type] || "📍"}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-white">{opt.name}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[rgba(94,23,235,0.1)] text-[#C084FC] border border-[rgba(94,23,235,0.2)]">
                                {TYPE_LABELS[opt.type] || opt.type}
                              </span>
                            </div>
                            <div className="text-xs text-fg-muted mt-1">{opt.address}</div>
                            <div className="text-xs text-fg-muted">{opt.city}, {opt.country}</div>
                            {opt.instructions && (
                              <div className="text-[10px] text-[#4ADE80] mt-1.5 flex items-start gap-1">
                                <span aria-hidden="true">ℹ️</span>
                                <span>{opt.instructions}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-5 p-3 bg-[rgba(0,240,255,0.05)] border border-[rgba(0,240,255,0.15)] rounded-xl">
                  <p className="text-xs text-fg-muted">
                    <span className="text-accent font-bold">Real-time tracking</span> — Once your order ships, you receive a tracking number via email/Telegram. Show the QR code at your chosen pickup point.
                  </p>
                </div>
              </div>
            </section>

            {/* DBX Premium ID Card Generator */}
            <section aria-labelledby="idcard-title">
              <div className="bg-bg-card rounded-3xl p-6 border border-[rgba(0,240,255,0.2)] h-full">
                <h2 id="idcard-title" className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <span aria-hidden="true">💎</span> DBX Premium ID Card
                </h2>
                <p className="text-fg-muted text-sm mb-5">
                  Connect your Phantom wallet to generate your Premium ID Card with embedded Solana Pay QR for instant discounts at checkout.
                </p>

                {/* Wallet Connect */}
                {!phantomAddress ? (
                  <button
                    onClick={connectPhantom}
                    className="w-full btn-glow-purple bg-primary hover:bg-primary-light text-white py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all mb-5 focus:outline-none focus:ring-2 focus:ring-accent flex items-center justify-center gap-2"
                    aria-label="Connect Phantom wallet to generate ID card"
                  >
                    <span aria-hidden="true">👻</span> Connect Phantom Wallet
                  </button>
                ) : (
                  <div className="mb-5 p-3 bg-[rgba(94,23,235,0.1)] border border-[rgba(94,23,235,0.3)] rounded-xl">
                    <div className="text-xs text-fg-muted mb-1">Connected Wallet</div>
                    <div className="text-xs font-mono text-accent truncate">{phantomAddress}</div>
                  </div>
                )}

                {/* ID Card Preview */}
                <div
                  className="relative rounded-2xl overflow-hidden mb-5"
                  style={{
                    background: "linear-gradient(135deg, #0D0D2B 0%, #1a0a3e 50%, #050510 100%)",
                    border: "1px solid rgba(0,240,255,0.3)",
                    minHeight: "180px",
                  }}
                  role="img"
                  aria-label="DBX Premium ID Card preview"
                >
                  {/* Card background pattern */}
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage: "linear-gradient(rgba(94,23,235,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(94,23,235,0.3) 1px, transparent 1px)",
                      backgroundSize: "20px 20px",
                    }}
                    aria-hidden="true"
                  />
                  <div className="relative z-10 p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="text-[10px] font-mono text-fg-muted uppercase tracking-widest">dBaronX Ecosystem</div>
                        <div className="text-lg font-extrabold gradient-text-purple">PREMIUM MEMBER</div>
                      </div>
                      <div className="text-2xl" aria-hidden="true">💎</div>
                    </div>

                    <div className="mb-4">
                      <div className="text-xs text-fg-muted mb-1">
                        {user ? user.email : "Connect wallet to generate"}
                      </div>
                      {phantomAddress && (
                        <div className="text-[10px] font-mono text-accent truncate">{phantomAddress.slice(0, 20)}...</div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-fg-muted">DBX Holder Benefits</div>
                        <div className="text-xs text-[#4ADE80] font-bold">10% Discount · Priority Shipping · Staking Rewards</div>
                      </div>
                      {/* Solana Pay QR placeholder */}
                      <div
                        className="w-12 h-12 rounded-lg bg-[rgba(0,240,255,0.1)] border border-[rgba(0,240,255,0.3)] flex items-center justify-center"
                        aria-label="Solana Pay QR code"
                      >
                        <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Generate Button */}
                <button
                  onClick={() => setCardGenerated(true)}
                  disabled={!user || !phantomAddress}
                  className="w-full btn-glow-cyan bg-transparent border border-accent text-accent py-3 rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-accent hover:text-bg-base transition-all disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent"
                  aria-label={!user ? "Login required to generate ID card" : !phantomAddress ? "Connect wallet to generate ID card" : "Generate Premium ID Card"}
                  aria-disabled={!user || !phantomAddress}
                >
                  {!user ? "Login Required" : !phantomAddress ? "Connect Wallet First" : cardGenerated ? "✓ Card Generated!" : "Generate Premium ID Card"}
                </button>

                {cardGenerated && (
                  <div className="mt-3 p-3 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.3)] rounded-xl text-xs text-[#4ADE80] text-center" role="alert">
                    ✅ Your Premium ID Card is ready! Use the Solana Pay QR at checkout for instant 10% discount.
                  </div>
                )}

                {/* Benefits List */}
                <div className="mt-5 space-y-2">
                  {[
                    "10% discount on all purchases",
                    "Priority anonymous shipping",
                    "DBX staking rewards",
                    "Exclusive member-only products",
                    "Carbon certificate per purchase",
                  ].map((benefit) => (
                    <div key={benefit} className="flex items-center gap-2 text-xs text-fg-muted">
                      <span className="text-[#4ADE80]" aria-hidden="true">✓</span>
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Telegram Bot CTA */}
          <div className="mt-10 bg-bg-card rounded-3xl p-6 border border-[rgba(0,240,255,0.15)] text-center">
            <h2 className="text-lg font-bold text-white mb-2">
              <span aria-hidden="true">🤖</span> Manage Everything via Telegram Bot
            </h2>
            <p className="text-fg-muted text-sm mb-4">
              Browse products, track orders, check affiliate earnings, and manage your wallet — all from Telegram. No app download needed.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="https://t.me/dBaronX_DBX_Token"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-glow-cyan inline-flex items-center gap-2 bg-transparent border border-accent text-accent px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wider hover:bg-accent hover:text-bg-base transition-all focus:outline-none focus:ring-2 focus:ring-accent"
                aria-label="Open dBaronX in Telegram bot"
              >
                <span aria-hidden="true">✈️</span> Open in Telegram Bot
              </a>
              <a
                href="/shop"
                className="inline-flex items-center gap-2 border border-[rgba(94,23,235,0.4)] text-[#C084FC] px-6 py-3 rounded-full font-bold text-sm uppercase tracking-wider hover:bg-[rgba(94,23,235,0.1)] transition-all focus:outline-none focus:ring-2 focus:ring-accent"
                aria-label="Browse shop"
              >
                <span aria-hidden="true">🛒</span> Browse Shop
              </a>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
