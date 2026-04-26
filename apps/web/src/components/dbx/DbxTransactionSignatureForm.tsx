"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  isSolanaSignature,
  normalizeSolanaSignature,
} from "@/lib/dbx/dbx-signature";
import { dbxSignatureInputDescription } from "@/utils/dbx/dbx-accessibility";
import type { DbxPaymentStatus } from "@/types/dbx/dbx-payment.types";

interface DbxTransactionSignatureFormProps {
  status: DbxPaymentStatus;
  loading?: boolean;
  disabled?: boolean;
  initialSignature?: string;
  onSubmit: (signature: string) => Promise<void> | void;
  className?: string;
}

export function DbxTransactionSignatureForm({
  status,
  loading = false,
  disabled = false,
  initialSignature = "",
  onSubmit,
  className = "",
}: DbxTransactionSignatureFormProps) {
  const [signature, setSignature] = useState(initialSignature);
  const [touched, setTouched] = useState(false);

  const normalized = normalizeSolanaSignature(signature);
  const valid = isSolanaSignature(normalized);
  const locked =
    disabled ||
    loading ||
    ["completed", "verified", "verified_pending_order_sync", "expired"].includes(status);

  const inputDescription = useMemo(
    () => dbxSignatureInputDescription(status),
    [status],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);

    if (locked || !valid) return;

    await onSubmit(normalized);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-3 ${className}`}
      aria-label="Submit DBX Solana transaction signature"
    >
      <label className="block">
        <span className="mb-2 block text-xs font-semibold text-white/70">
          Solana transaction signature
        </span>
        <textarea
          value={signature}
          onChange={(event) => setSignature(event.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="Paste the confirmed Solana transaction signature"
          disabled={locked}
          rows={3}
          className="min-h-[92px] w-full resize-none rounded-xl border border-[rgba(94,23,235,0.35)] bg-[#09091F] px-3 py-3 font-mono text-xs text-white outline-none transition placeholder:text-white/25 focus:border-[#C084FC] focus:ring-2 focus:ring-[#C084FC]/30 disabled:cursor-not-allowed disabled:opacity-55"
          aria-label="Solana transaction signature"
          aria-describedby="dbx-signature-help dbx-signature-error"
          aria-invalid={touched && Boolean(normalized) && !valid}
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      <p id="dbx-signature-help" className="text-[11px] leading-relaxed text-white/45">
        {inputDescription}
      </p>

      {touched && normalized && !valid ? (
        <p
          id="dbx-signature-error"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-200"
          role="alert"
        >
          Enter the full Solana transaction signature. It should be base58 and usually 80–90 characters.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={locked || !valid}
        className="w-full rounded-xl bg-[#5E17EB] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#C084FC] focus:ring-offset-2 focus:ring-offset-[#09091F] disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Verify DBX payment transaction"
      >
        {loading ? "Verifying DBX payment..." : "Verify DBX Payment"}
      </button>
    </form>
  );
}