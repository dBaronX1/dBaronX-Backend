"use client";

import { useEffect } from "react";
import { DbxCheckoutInline } from "@/components/checkout/dbx/DbxCheckoutInline";
import type { DbxCheckoutInput } from "@/types/dbx-checkout";

interface DbxCheckoutModalProps {
  open: boolean;
  checkout: DbxCheckoutInput;
  title?: string;
  onClose: () => void;
  onCompleted?: (reference: string) => void;
  onFailed?: (reason: string) => void;
  footer?: React.ReactNode;
}

export function DbxCheckoutModal({
  open,
  checkout,
  title = "DBX Checkout",
  onClose,
  onCompleted,
  onFailed,
  footer,
}: DbxCheckoutModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-white/10 bg-[#07071A] p-4 shadow-2xl sm:max-w-xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 px-3 py-1 text-sm font-bold text-white/70 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-[#C084FC]"
            aria-label="Close DBX checkout"
          >
            ×
          </button>
        </div>

        <DbxCheckoutInline
          checkout={checkout}
          autoCreate
          onCompleted={onCompleted}
          onFailed={onFailed}
        />

        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </div>
  );
}