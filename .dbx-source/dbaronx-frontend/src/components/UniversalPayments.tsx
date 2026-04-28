"use client";
import React, { useState } from "react";

interface PaymentSectionProps {
  totalUsd: number;
  onPaymentMethodChange?: (method: string) => void;
  selectedMethod?: string;
  onProofUpload?: (file: File | null) => void;
  onTxIdChange?: (txId: string) => void;
  txId?: string;
  proofNotes?: string;
  onProofNotesChange?: (notes: string) => void;
  dbxDiscount?: boolean;
  globalOpsPct?: number;
}

const MERCHANT_WALLET = "4ZdL7df7KoDTyVqAnQ398ofsykqsox2S834KQBXNQNYE";

export default function UniversalPayments({
  totalUsd,
  onPaymentMethodChange,
  selectedMethod = "manual_proof",
  onProofUpload,
  onTxIdChange,
  txId = "",
  proofNotes = "",
  onProofNotesChange,
  dbxDiscount = false,
  globalOpsPct = 0,
}: PaymentSectionProps) {
  const [copied, setCopied] = useState(false);
  const [bankExpanded, setBankExpanded] = useState(false);

  const discountedTotal = dbxDiscount ? totalUsd * 0.85 : totalUsd;

  const copyWallet = async () => {
    try {
      await navigator.clipboard.writeText(MERCHANT_WALLET);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  const paymentMethods = [
    { value: "solana_pay", label: "Solana Pay", icon: "◎", desc: "Instant DBX token payment", badge: "Recommended" },
    { value: "wallet_connect", label: "Phantom Wallet", icon: "👻", desc: "Connect & pay with SOL/DBX", badge: dbxDiscount ? "15% OFF" : "" },
    { value: "flutterwave", label: "Flutterwave", icon: "🌍", desc: "Cards + Mobile Money worldwide", badge: "Coming Soon" },
    { value: "stripe", label: "Stripe", icon: "💳", desc: "Global card payments", badge: "Coming Soon" },
    { value: "bank_transfer", label: "Banks", icon: "🏦", desc: "Bank transfer worldwide", badge: "" },
    { value: "manual_proof", label: "Manual Proof", icon: "📋", desc: "Upload payment receipt", badge: "" },
  ];

  return (
    <div className="space-y-4">
      {/* DBX Discount Banner */}
      {dbxDiscount && (
        <div className="bg-[rgba(0,240,255,0.08)] border border-[rgba(0,240,255,0.25)] rounded-xl p-3 flex items-center gap-3">
          <span className="text-xl">💎</span>
          <div>
            <div className="text-xs font-bold text-accent">DBX Holder — 15% Discount Applied!</div>
            <div className="text-xs text-fg-muted">
              Original: <span className="line-through">${totalUsd.toFixed(2)}</span> → You pay: <span className="text-[#4ADE80] font-bold">${discountedTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Global Ops Progress Bar */}
      {globalOpsPct > 0 && (
        <div className="bg-[rgba(34,197,94,0.06)] border border-[rgba(34,197,94,0.2)] rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#4ADE80] flex items-center gap-1">
              <span>🌍</span> Your purchase funds global ops
            </span>
            <span className="text-xs font-bold text-[#4ADE80]">{globalOpsPct}% funded</span>
          </div>
          <div className="h-1.5 bg-bg-base rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#4ADE80] to-accent rounded-full transition-all"
              style={{ width: `${globalOpsPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Payment Method Selection */}
      <div>
        <label className="block text-sm font-medium text-fg-muted mb-2">Payment Method</label>
        <div className="grid grid-cols-2 gap-2">
          {paymentMethods.map((method) => {
            const isComingSoon = method.badge === "Coming Soon";
            return (
              <button
                key={method.value}
                onClick={() => !isComingSoon && onPaymentMethodChange?.(method.value)}
                disabled={isComingSoon}
                className={`relative p-3 rounded-xl border text-left transition-all ${
                  selectedMethod === method.value && !isComingSoon
                    ? "border-accent bg-accent/10 text-accent"
                    : isComingSoon
                    ? "border-[rgba(255,255,255,0.05)] opacity-50 cursor-not-allowed"
                    : "border-[rgba(94,23,235,0.3)] text-fg-muted hover:border-accent/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{method.icon}</span>
                  <span className="text-xs font-bold">{method.label}</span>
                </div>
                <p className="text-[10px] text-fg-muted leading-tight">{method.desc}</p>
                {method.badge && (
                  <span className={`absolute top-1.5 right-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                    method.badge === "Recommended" ? "bg-[#4ADE80]/20 text-[#4ADE80]" :
                    method.badge === "15% OFF"? "bg-accent/20 text-accent" : "bg-fg-muted/20 text-fg-muted"
                  }`}>
                    {method.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Solana Pay Instructions */}
      {(selectedMethod === "solana_pay" || selectedMethod === "wallet_connect") && (
        <div className="bg-[rgba(0,240,255,0.05)] border border-[rgba(0,240,255,0.15)] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-accent font-bold text-sm">◎ Solana Pay</span>
            <span className="text-xs text-fg-muted">— Send DBX or SOL to:</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[10px] font-mono text-accent bg-bg-base rounded-lg px-3 py-2 truncate border border-[rgba(0,240,255,0.1)]">
              {MERCHANT_WALLET}
            </code>
            <button
              onClick={copyWallet}
              className="text-xs px-3 py-2 rounded-lg border border-accent/30 text-accent hover:bg-accent/10 transition-all flex-shrink-0"
            >
              {copied ? "✓" : "Copy"}
            </button>
          </div>
          <div>
            <label className="block text-xs text-fg-muted mb-1.5">Transaction ID (after sending)</label>
            <input
              type="text"
              value={txId}
              onChange={(e) => onTxIdChange?.(e.target.value)}
              className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-3 py-2 text-fg-base text-xs focus:outline-none focus:border-accent font-mono"
              placeholder="Paste Solana TX hash..."
            />
          </div>
          <p className="text-[10px] text-fg-muted">
            Amount: <span className="text-accent font-bold">${discountedTotal.toFixed(2)}</span> equivalent in DBX/SOL.
            {dbxDiscount && " DBX holder discount applied."}
          </p>
        </div>
      )}

      {/* Bank Transfer Section */}
      {selectedMethod === "bank_transfer" && (
        <div className="bg-[rgba(94,23,235,0.05)] border border-[rgba(94,23,235,0.2)] rounded-xl p-4 space-y-3">
          <button
            onClick={() => setBankExpanded(!bankExpanded)}
            className="w-full flex items-center justify-between text-left"
          >
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <span>🏦</span> Banks
            </span>
            <span className="text-fg-muted text-xs">{bankExpanded ? "▲" : "▼"}</span>
          </button>
          <div className="text-xs text-fg-muted leading-relaxed border-t border-[rgba(94,23,235,0.15)] pt-3">
            <p className="font-medium text-white mb-2">Bank Transfers Worldwide</p>
            <p>
              Anyone anywhere with a bank account can engage on the platform with proven KYC of Bank receipt with clean matching account details of holder matching holder&apos;s government issued ID or passport.
            </p>
          </div>
          {bankExpanded && (
            <div className="space-y-3 border-t border-[rgba(94,23,235,0.15)] pt-3">
              <p className="text-xs text-fg-muted">
                Contact <a href="mailto:info@dbaronx.com" className="text-accent hover:underline">info@dbaronx.com</a> for bank transfer details. Include your order reference.
              </p>
              <div>
                <label className="block text-xs text-fg-muted mb-1.5">Upload Bank Receipt / Proof</label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => onProofUpload?.(e.target.files?.[0] || null)}
                  className="w-full text-xs text-fg-muted file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 transition-all"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Proof Upload */}
      {selectedMethod === "manual_proof" && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-fg-muted mb-1.5">Upload Payment Proof</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => onProofUpload?.(e.target.files?.[0] || null)}
              className="w-full text-xs text-fg-muted file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs text-fg-muted mb-1.5">Notes (optional)</label>
            <input
              type="text"
              value={proofNotes}
              onChange={(e) => onProofNotesChange?.(e.target.value)}
              className="w-full bg-bg-base border border-[rgba(94,23,235,0.3)] rounded-xl px-3 py-2 text-fg-base text-xs focus:outline-none focus:border-accent"
              placeholder="Payment reference, notes..."
            />
          </div>
        </div>
      )}

      {/* Flutterwave placeholder */}
      {selectedMethod === "flutterwave" && (
        <div className="bg-[rgba(255,165,0,0.05)] border border-[rgba(255,165,0,0.2)] rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🌍</div>
          <p className="text-sm font-bold text-white mb-1">Flutterwave — Coming Soon</p>
          <p className="text-xs text-fg-muted">Cards + Mobile Money worldwide. Integration launching soon.</p>
          <p className="text-xs text-fg-muted mt-2">Use Solana Pay or Manual Proof in the meantime.</p>
        </div>
      )}

      {/* Stripe placeholder */}
      {selectedMethod === "stripe" && (
        <div className="bg-[rgba(99,91,255,0.05)] border border-[rgba(99,91,255,0.2)] rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">💳</div>
          <p className="text-sm font-bold text-white mb-1">Stripe — Coming Soon</p>
          <p className="text-xs text-fg-muted">Global card payments. Integration launching after business verification.</p>
          <p className="text-xs text-fg-muted mt-2">Use Solana Pay or Manual Proof in the meantime.</p>
        </div>
      )}

      {/* Amount Summary */}
      <div className="bg-bg-base rounded-xl p-3 border border-[rgba(94,23,235,0.15)]">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-fg-muted">Subtotal</span>
          <span className="text-fg-base">${totalUsd.toFixed(2)}</span>
        </div>
        {dbxDiscount && (
          <div className="flex justify-between text-xs mb-1">
            <span className="text-accent">DBX Holder Discount (15%)</span>
            <span className="text-accent">-${(totalUsd * 0.15).toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold border-t border-[rgba(94,23,235,0.15)] pt-2 mt-2">
          <span className="text-white">Total</span>
          <span className="text-[#4ADE80]">${discountedTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
