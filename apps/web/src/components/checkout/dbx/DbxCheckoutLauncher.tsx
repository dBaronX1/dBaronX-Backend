"use client";

import { useState } from "react";
import { DbxCheckoutModal } from "@/components/checkout/dbx/DbxCheckoutModal";
import type { DbxCheckoutInput } from "@/types/dbx-checkout";

interface DbxCheckoutLauncherProps {
  checkout: DbxCheckoutInput;
  disabled?: boolean;
  label?: string;
  className?: string;
  onCompleted?: (reference: string) => void;
  onFailed?: (reason: string) => void;
}

export function DbxCheckoutLauncher({
  checkout,
  disabled = false,
  label = "Pay with DBX",
  className = "",
  onCompleted,
  onFailed,
}: DbxCheckoutLauncherProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={className}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl bg-[#5E17EB] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(94,23,235,0.25)] transition hover:bg-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#C084FC] focus:ring-offset-2 focus:ring-offset-[#09091F] disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={label}
      >
        {label}
      </button>

      <DbxCheckoutModal
        open={open}
        checkout={checkout}
        onClose={() => setOpen(false)}
        onCompleted={(reference) => {
          onCompleted?.(reference);
          setOpen(false);
        }}
        onFailed={onFailed}
      />
    </div>
  );
}