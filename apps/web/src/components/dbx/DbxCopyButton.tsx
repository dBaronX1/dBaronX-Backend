"use client";

import { useClipboard } from "@/hooks/dbx/useClipboard";

interface DbxCopyButtonProps {
  value: string;
  label?: string;
  copiedLabel?: string;
  copyKey?: string;
  className?: string;
  ariaLabel?: string;
}

export function DbxCopyButton({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  copyKey = "default",
  className = "",
  ariaLabel,
}: DbxCopyButtonProps) {
  const { copy, isCopied } = useClipboard();
  const copied = isCopied(copyKey);

  return (
    <button
      type="button"
      onClick={() => copy(value, copyKey)}
      className={`rounded-lg border border-[rgba(94,23,235,0.35)] px-2 py-1 text-[11px] font-semibold text-[#C084FC] transition hover:border-[#C084FC] focus:outline-none focus:ring-2 focus:ring-[#C084FC] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      aria-label={ariaLabel || `${label} DBX payment value`}
      disabled={!value}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}