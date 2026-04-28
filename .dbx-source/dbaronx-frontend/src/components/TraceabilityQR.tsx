"use client";
import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface TraceabilityData {
  id: string;
  batch_id: string;
  qr_code_data: string;
  solana_tx_hash: string;
  farm_name: string;
  farm_location: string;
  harvest_date: string;
  processing_date: string;
  palm_kernel_source: string;
  recycled_plastic_source: string;
  waste_processed_kg: number;
  co2_saved_kg: number;
  jobs_supported: number;
  certifications: string[];
  is_verified: boolean;
}

interface Props {
  productId: string;
  productName: string;
}

export default function TraceabilityQR({ productId, productName }: Props) {
  const [trace, setTrace] = useState<TraceabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!productId) return;
    fetchTrace();
  }, [productId]);

  const fetchTrace = async () => {
    try {
      const { data, error } = await supabase
        .from("traceability")
        .select("*")
        .eq("product_id", productId)
        .eq("is_verified", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        console.log("Trace error:", error.message);
      }
      setTrace(data || null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-bg-card rounded-2xl p-4 border border-[rgba(94,23,235,0.2)] animate-pulse h-24" aria-busy="true" aria-label="Loading traceability data" />
    );
  }

  if (!trace) {
    return (
      <div className="bg-bg-card rounded-2xl p-4 border border-[rgba(94,23,235,0.1)]">
        <div className="flex items-center gap-2 text-fg-muted text-xs">
          <span aria-hidden="true">🔗</span>
          <span>Blockchain traceability coming soon for this product</span>
        </div>
      </div>
    );
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(trace.qr_code_data)}&bgcolor=0D0D2B&color=00F0FF&format=png`;

  return (
    <div
      className="bg-bg-card rounded-2xl border border-[rgba(0,240,255,0.2)] overflow-hidden"
      role="region"
      aria-label={`Blockchain traceability for ${productName}`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent"
        aria-expanded={expanded}
        aria-controls="trace-details"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[rgba(0,240,255,0.1)] flex items-center justify-center" aria-hidden="true">
            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="text-left">
            <div className="text-xs font-bold text-white flex items-center gap-2">
              Blockchain Verified
              {trace.is_verified && (
                <span className="text-[10px] bg-[rgba(34,197,94,0.15)] text-[#4ADE80] border border-[rgba(34,197,94,0.3)] px-2 py-0.5 rounded-full font-mono" aria-label="Verified on blockchain">
                  ✓ ON-CHAIN
                </span>
              )}
            </div>
            <div className="text-[10px] text-fg-muted font-mono">Batch: {trace.batch_id}</div>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-fg-muted transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div id="trace-details" className="border-t border-[rgba(0,240,255,0.1)] p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* QR Code */}
            <div className="flex-shrink-0 flex flex-col items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrUrl}
                alt={`QR code for blockchain verification of ${productName} batch ${trace.batch_id}`}
                width={100}
                height={100}
                className="rounded-lg border border-[rgba(0,240,255,0.2)]"
                loading="lazy"
              />
              <span className="text-[10px] text-fg-muted font-mono text-center">Scan to verify</span>
            </div>

            {/* Trace Details */}
            <div className="flex-1 space-y-3">
              {/* Farm Source */}
              <div>
                <div className="text-[10px] font-mono text-fg-muted uppercase tracking-wider mb-1">🌴 Farm Source</div>
                <div className="text-xs text-white font-medium">{trace.farm_name}</div>
                <div className="text-[10px] text-fg-muted">{trace.farm_location}</div>
                {trace.harvest_date && (
                  <div className="text-[10px] text-fg-muted">
                    Harvested: {new Date(trace.harvest_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                )}
              </div>

              {/* Impact Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-bg-card2 rounded-lg p-2 text-center">
                  <div className="text-sm font-bold text-[#4ADE80]">{trace.waste_processed_kg}kg</div>
                  <div className="text-[9px] text-fg-muted">Waste Diverted</div>
                </div>
                <div className="bg-bg-card2 rounded-lg p-2 text-center">
                  <div className="text-sm font-bold text-accent">{trace.co2_saved_kg}kg</div>
                  <div className="text-[9px] text-fg-muted">CO₂ Saved</div>
                </div>
                <div className="bg-bg-card2 rounded-lg p-2 text-center">
                  <div className="text-sm font-bold text-[#C084FC]">{trace.jobs_supported}</div>
                  <div className="text-[9px] text-fg-muted">Jobs Supported</div>
                </div>
              </div>

              {/* Recycled plastic source */}
              {trace.recycled_plastic_source && (
                <div>
                  <div className="text-[10px] font-mono text-fg-muted uppercase tracking-wider mb-1">♻️ Recycled Plastic</div>
                  <div className="text-[10px] text-fg-muted">{trace.recycled_plastic_source}</div>
                </div>
              )}

              {/* Solana TX */}
              {trace.solana_tx_hash && (
                <a
                  href={`https://solscan.io/tx/${trace.solana_tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[10px] text-accent hover:underline font-mono focus:outline-none focus:ring-2 focus:ring-accent rounded"
                  aria-label={`View transaction ${trace.solana_tx_hash} on Solscan`}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View on Solscan
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
