"use client";

import { useMemo, useState } from "react";
import { useDbxPayment } from "@/hooks/useDbxPayment";
import type { CreateDbxPaymentIntentPayload } from "@/lib/api/nest/dbx-payments";

interface DbxPaymentPanelProps {
  payload: CreateDbxPaymentIntentPayload;
  disabled?: boolean;
  className?: string;
  onCompleted?: (reference: string) => void;
  onFailed?: (reason: string) => void;
}

function shortAddress(value: string, left = 6, right = 6): string {
  if (!value) return "";
  if (value.length <= left + right + 3) return value;
  return `${value.slice(0, left)}...${value.slice(-right)}`;
}

export function DbxPaymentPanel({
  payload,
  disabled = false,
  className = "",
  onCompleted,
  onFailed,
}: DbxPaymentPanelProps) {
  const {
    intent,
    verification,
    status,
    step,
    loading,
    verifying,
    error,
    createIntent,
    verify,
    refreshStatus,
  } = useDbxPayment();

  const [transactionSignature, setTransactionSignature] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const activeStatus = verification?.status || status?.status || intent?.status || "pending";

  const expiresText = useMemo(() => {
    if (!intent?.expiresAt) return "";
    try {
      return new Intl.DateTimeFormat(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "short",
      }).format(new Date(intent.expiresAt));
    } catch {
      return intent.expiresAt;
    }
  }, [intent?.expiresAt]);

  async function copy(value: string, key: string) {
    await navigator.clipboard.writeText(value);
    setCopiedField(key);
    window.setTimeout(() => setCopiedField(null), 1400);
  }

  async function handleCreateIntent() {
    const result = await createIntent(payload);
    setTransactionSignature("");

    if (result.status === "completed") {
      onCompleted?.(result.reference);
    }
  }

  async function handleVerify() {
    if (!intent?.reference || !transactionSignature.trim()) return;

    const result = await verify({
      intentReference: intent.reference,
      transactionSignature: transactionSignature.trim(),
      senderWallet: payload.senderWallet,
    });

    if (result.status === "completed") {
      onCompleted?.(result.reference);
    }

    if (result.status === "failed" || result.status === "expired") {
      onFailed?.(result.failureReason || "DBX payment verification failed.");
    }
  }

  async function handleRefresh() {
    const result = await refreshStatus();

    if (result?.status === "completed") {
      onCompleted?.(result.reference);
    }

    if (result?.status === "failed" || result?.status === "expired") {
      onFailed?.(result.failureReason || "DBX payment failed.");
    }
  }

  return (
    <section
      className={`rounded-2xl border border-[rgba(94,23,235,0.25)] bg-[#0D0D2B] p-4 shadow-[0_0_30px_rgba(94,23,235,0.10)] ${className}`}
      aria-label="DBX crypto payment"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C084FC]">
            DBX Solana Payment
          </p>
          <h3 className="mt-1 text-lg font-bold text-white">
            Pay with dBaronX DBX
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            Send the exact DBX amount to the treasury wallet, then paste your Solana transaction signature for verification.
          </p>
        </div>

        <span
          className="inline-flex w-fit rounded-full border border-[rgba(94,23,235,0.35)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#C084FC]"
          role="status"
          aria-live="polite"
        >
          {activeStatus}
        </span>
      </div>

      {!intent ? (
        <button
          type="button"
          disabled={disabled || loading}
          onClick={handleCreateIntent}
          className="mt-4 w-full rounded-xl bg-[#5E17EB] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#7C3AED] disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Create DBX payment intent"
        >
          {loading ? "Creating DBX payment..." : "Create DBX Payment Intent"}
        </button>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-[rgba(94,23,235,0.20)] bg-[#09091F] p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-white/60">Reference</span>
              <button
                type="button"
                onClick={() => copy(intent.reference, "reference")}
                className="rounded-lg border border-[rgba(94,23,235,0.35)] px-2 py-1 text-[11px] text-[#C084FC]"
                aria-label="Copy DBX payment reference"
              >
                {copiedField === "reference" ? "Copied" : "Copy"}
              </button>
            </div>
            <code className="block break-all text-xs text-white">{intent.reference}</code>
          </div>

          <div className="rounded-xl border border-[rgba(94,23,235,0.20)] bg-[#09091F] p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-white/60">Treasury Wallet</span>
              <button
                type="button"
                onClick={() => copy(intent.instructions.treasuryWallet, "wallet")}
                className="rounded-lg border border-[rgba(94,23,235,0.35)] px-2 py-1 text-[11px] text-[#C084FC]"
                aria-label="Copy DBX treasury wallet"
              >
                {copiedField === "wallet" ? "Copied" : "Copy"}
              </button>
            </div>
            <code className="block break-all text-xs text-white">
              {intent.instructions.treasuryWallet}
            </code>
            <p className="mt-2 text-[11px] text-white/45">
              Short: {shortAddress(intent.instructions.treasuryWallet)}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[rgba(94,23,235,0.20)] bg-[#09091F] p-3">
              <p className="text-xs font-semibold text-white/60">Amount</p>
              <p className="mt-1 text-lg font-bold text-white">
                {intent.instructions.amountDisplay} DBX
              </p>
              <p className="mt-1 break-all text-[11px] text-white/45">
                Base units: {intent.instructions.amountBaseUnits}
              </p>
            </div>

            <div className="rounded-xl border border-[rgba(94,23,235,0.20)] bg-[#09091F] p-3">
              <p className="text-xs font-semibold text-white/60">Expires</p>
              <p className="mt-1 text-sm font-semibold text-white">{expiresText}</p>
              <p className="mt-1 text-[11px] text-white/45">
                Expired intents cannot be verified.
              </p>
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-white/70">
              Solana transaction signature
            </span>
            <input
              value={transactionSignature}
              onChange={(event) => setTransactionSignature(event.target.value)}
              placeholder="Paste confirmed Solana transaction signature"
              className="w-full rounded-xl border border-[rgba(94,23,235,0.35)] bg-[#09091F] px-3 py-3 font-mono text-xs text-white outline-none transition focus:border-[#C084FC]"
              aria-label="Solana transaction signature"
              autoComplete="off"
              inputMode="text"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={verifying || !transactionSignature.trim()}
              onClick={handleVerify}
              className="rounded-xl bg-[#5E17EB] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#7C3AED] disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Verify DBX payment"
            >
              {verifying ? "Verifying..." : "Verify Payment"}
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              className="rounded-xl border border-[rgba(94,23,235,0.35)] px-4 py-3 text-sm font-bold text-[#C084FC] transition hover:border-[#C084FC]"
              aria-label="Refresh DBX payment status"
            >
              Refresh Status
            </button>
          </div>
        </div>
      )}

      {error ? (
        <div
          className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {step === "completed" ? (
        <div
          className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200"
          role="status"
          aria-live="polite"
        >
          DBX payment completed and order sync has been accepted.
        </div>
      ) : null}

      {activeStatus === "verified_pending_order_sync" ? (
        <div
          className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100"
          role="status"
          aria-live="polite"
        >
          Payment verified. Order sync is pending and will be retried safely.
        </div>
      ) : null}
    </section>
  );
}
