"use client";
import React, { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";
import OpenInBotButton from "@/components/OpenInBotButton";

interface ImpactMetric {
  id: string;
  metric_date: string;
  waste_processed_tons: number;
  co2_saved_tons: number;
  jobs_created: number;
  farm_yield_kg: number;
  biogas_kwh: number;
  trees_planted: number;
  water_saved_liters: number;
  plastic_recycled_kg: number;
  soap_bars_produced: number;
  biochar_kg: number;
  notes: string;
}

interface AggregatedMetrics {
  total_waste: number;
  total_co2: number;
  total_jobs: number;
  total_farm_yield: number;
  total_biogas: number;
  total_plastic: number;
  total_soap: number;
  total_biochar: number;
  total_trees: number;
  total_water: number;
}

function AnimatedCounter({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 1800;
    const step = (end - start) / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { start = end; clearInterval(timer); }
      setDisplay(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <span ref={ref} aria-label={`${value.toFixed(decimals)}${suffix}`}>
      {display.toFixed(decimals)}{suffix}
    </span>
  );
}

const METRIC_CARDS = [
  { key: "total_waste", label: "Waste Processed", unit: "tons", icon: "♻️", color: "#4ADE80", decimals: 1 },
  { key: "total_co2", label: "CO₂ Saved", unit: "tons", icon: "🌱", color: "#00F0FF", decimals: 1 },
  { key: "total_jobs", label: "Jobs Created", unit: "", icon: "👷", color: "#C084FC", decimals: 0 },
  { key: "total_farm_yield", label: "Farm Yield", unit: "kg", icon: "🌾", color: "#F59E0B", decimals: 0 },
  { key: "total_biogas", label: "Biogas Energy", unit: "kWh", icon: "⚡", color: "#4ADE80", decimals: 0 },
  { key: "total_plastic", label: "Plastic Recycled", unit: "kg", icon: "🧴", color: "#00F0FF", decimals: 0 },
  { key: "total_soap", label: "Soap Bars Made", unit: "", icon: "🧼", color: "#C084FC", decimals: 0 },
  { key: "total_biochar", label: "Biochar Produced", unit: "kg", icon: "🪨", color: "#F59E0B", decimals: 0 },
];

export default function ImpactPage() {
  const [metrics, setMetrics] = useState<ImpactMetric[]>([]);
  const [aggregated, setAggregated] = useState<AggregatedMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const supabase = createClient();

  useEffect(() => {
    fetchMetrics();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchMetrics, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const { data, error } = await supabase
        .from("impact_metrics")
        .select("*")
        .order("metric_date", { ascending: false })
        .limit(30);

      if (error) { console.log("Impact metrics error:", error.message); return; }
      const rows = data || [];
      setMetrics(rows);

      // Aggregate totals
      const agg: AggregatedMetrics = {
        total_waste: rows.reduce((s, r) => s + (r.waste_processed_tons || 0), 0),
        total_co2: rows.reduce((s, r) => s + (r.co2_saved_tons || 0), 0),
        total_jobs: Math.max(...rows.map((r) => r.jobs_created || 0), 0),
        total_farm_yield: rows.reduce((s, r) => s + (r.farm_yield_kg || 0), 0),
        total_biogas: rows.reduce((s, r) => s + (r.biogas_kwh || 0), 0),
        total_plastic: rows.reduce((s, r) => s + (r.plastic_recycled_kg || 0), 0),
        total_soap: rows.reduce((s, r) => s + (r.soap_bars_produced || 0), 0),
        total_biochar: rows.reduce((s, r) => s + (r.biochar_kg || 0), 0),
        total_trees: rows.reduce((s, r) => s + (r.trees_planted || 0), 0),
        total_water: rows.reduce((s, r) => s + (r.water_saved_liters || 0), 0),
      };
      setAggregated(agg);
      setLastUpdated(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative bg-bg-base min-h-screen" id="main-content">
      <Header />

      {/* Hero */}
      <section
        className="relative pt-28 pb-16 px-6 overflow-hidden circuit-bg"
        aria-labelledby="impact-title"
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.12) 0%, transparent 60%)" }}
          aria-hidden="true"
        />
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 tag-badge tag-badge-green mb-6">
            <span aria-hidden="true">🌍</span> Live Impact Data
          </div>
          <h1 id="impact-title" className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
            <span className="gradient-text-silver">Real-Time</span>{" "}
            <span className="text-[#4ADE80]">Impact Hub</span>
          </h1>
          <p className="text-fg-muted text-lg max-w-2xl mx-auto mb-6">
            Live metrics from our global operations — waste processed, CO₂ saved, jobs created, farm yields, and biogas energy. Updated daily.
          </p>
          {lastUpdated && (
            <div className="inline-flex items-center gap-2 text-xs font-mono text-fg-muted bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)] px-4 py-2 rounded-full mb-4">
              <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" aria-hidden="true" />
              <span>Last updated: {lastUpdated}</span>
            </div>
          )}
          <div className="flex justify-center">
            <OpenInBotButton page="impact" size="md" variant="outline" label="View in Bot" />
          </div>
        </div>
      </section>

      {/* Metrics Grid */}
      <section className="px-6 pb-16" aria-label="Impact metrics">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4" aria-busy="true" aria-label="Loading metrics">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-bg-card rounded-2xl p-6 animate-pulse h-32" aria-hidden="true" />
              ))}
            </div>
          ) : aggregated ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4" role="list">
              {METRIC_CARDS.map((card) => {
                const val = aggregated[card.key as keyof AggregatedMetrics] || 0;
                return (
                  <article
                    key={card.key}
                    role="listitem"
                    className="bg-bg-card rounded-2xl p-5 border border-[rgba(255,255,255,0.05)] hover:border-opacity-30 transition-all group"
                    style={{ borderColor: `${card.color}20` }}
                    aria-label={`${card.label}: ${val.toFixed(card.decimals)} ${card.unit}`}
                  >
                    <div className="text-2xl mb-2" aria-hidden="true">{card.icon}</div>
                    <div
                      className="text-2xl md:text-3xl font-extrabold font-mono mb-1"
                      style={{ color: card.color }}
                    >
                      <AnimatedCounter value={val} decimals={card.decimals} />
                      {card.unit && <span className="text-sm ml-1 font-normal text-fg-muted">{card.unit}</span>}
                    </div>
                    <div className="text-xs text-fg-muted font-medium">{card.label}</div>
                    <div
                      className="mt-2 h-0.5 rounded-full"
                      style={{ background: `linear-gradient(90deg, ${card.color}60, transparent)` }}
                      aria-hidden="true"
                    />
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-fg-muted py-12">No impact data available yet.</p>
          )}
        </div>
      </section>

      {/* Daily Timeline */}
      {metrics.length > 0 && (
        <section className="px-6 pb-16" aria-labelledby="daily-timeline-title">
          <div className="max-w-7xl mx-auto">
            <h2 id="daily-timeline-title" className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span aria-hidden="true">📅</span> Daily Operations Log
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-[rgba(94,23,235,0.2)]" role="region" aria-label="Daily operations table">
              <table className="w-full text-sm" role="table">
                <thead>
                  <tr className="border-b border-[rgba(94,23,235,0.2)] bg-bg-card2">
                    <th scope="col" className="text-left px-4 py-3 text-fg-muted font-mono text-xs uppercase tracking-wider">Date</th>
                    <th scope="col" className="text-right px-4 py-3 text-fg-muted font-mono text-xs uppercase tracking-wider">Waste (t)</th>
                    <th scope="col" className="text-right px-4 py-3 text-fg-muted font-mono text-xs uppercase tracking-wider">CO₂ (t)</th>
                    <th scope="col" className="text-right px-4 py-3 text-fg-muted font-mono text-xs uppercase tracking-wider">Jobs</th>
                    <th scope="col" className="text-right px-4 py-3 text-fg-muted font-mono text-xs uppercase tracking-wider hidden md:table-cell">Plastic (kg)</th>
                    <th scope="col" className="text-right px-4 py-3 text-fg-muted font-mono text-xs uppercase tracking-wider hidden md:table-cell">Soap</th>
                    <th scope="col" className="text-left px-4 py-3 text-fg-muted font-mono text-xs uppercase tracking-wider hidden lg:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.slice(0, 14).map((m, i) => (
                    <tr
                      key={m.id}
                      className={`border-b border-[rgba(255,255,255,0.03)] hover:bg-white/[0.02] transition-colors ${i === 0 ? "bg-[rgba(34,197,94,0.04)]" : ""}`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-fg-muted">
                        {new Date(m.metric_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        {i === 0 && <span className="ml-2 text-[10px] text-[#4ADE80] font-bold">TODAY</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[#4ADE80]">{m.waste_processed_tons?.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right font-mono text-accent">{m.co2_saved_tons?.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right font-mono text-[#C084FC]">{m.jobs_created}</td>
                      <td className="px-4 py-3 text-right font-mono text-fg-muted hidden md:table-cell">{m.plastic_recycled_kg?.toFixed(0)}</td>
                      <td className="px-4 py-3 text-right font-mono text-fg-muted hidden md:table-cell">{m.soap_bars_produced}</td>
                      <td className="px-4 py-3 text-xs text-fg-muted hidden lg:table-cell max-w-xs truncate">{m.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Carbon Certificate CTA */}
      <section className="px-6 pb-20" aria-labelledby="certificate-cta-title">
        <div className="max-w-3xl mx-auto">
          <div className="bg-bg-card rounded-3xl p-8 border border-[rgba(34,197,94,0.2)] text-center">
            <div className="text-4xl mb-4" aria-hidden="true">🌿</div>
            <h2 id="certificate-cta-title" className="text-2xl font-bold text-white mb-3">
              Get Your Carbon Certificate
            </h2>
            <p className="text-fg-muted text-sm mb-6 max-w-md mx-auto">
              Every purchase on dBaronX funds Ghana operations and earns you a verifiable carbon offset certificate. Download as PDF or mint on-chain.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/shop"
                className="btn-glow-green bg-[#22C55E] hover:bg-[#16A34A] text-white px-8 py-3 rounded-full font-bold text-sm uppercase tracking-wider transition-all inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#4ADE80]"
                aria-label="Shop now to earn carbon certificate"
              >
                <span aria-hidden="true">🛒</span> Shop & Earn Certificate
              </a>
              <a
                href="https://t.me/dBaronX_DBX_Token"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-[rgba(34,197,94,0.4)] text-[#4ADE80] px-8 py-3 rounded-full font-bold text-sm uppercase tracking-wider hover:bg-[rgba(34,197,94,0.1)] transition-all inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#4ADE80]"
                aria-label="Join Telegram community"
              >
                <span aria-hidden="true">📱</span> Join Community
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
