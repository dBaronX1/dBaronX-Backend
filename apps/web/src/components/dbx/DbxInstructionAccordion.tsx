"use client";

import { useState } from "react";
import type { DbxPaymentInstruction } from "@/types/dbx/dbx-payment.types";
import { DbxWalletInstruction } from "@/components/dbx/DbxWalletInstruction";

interface DbxInstructionAccordionProps {
  instruction: DbxPaymentInstruction;
  defaultOpen?: boolean;
  className?: string;
}

export function DbxInstructionAccordion({
  instruction,
  defaultOpen = true,
  className = "",
}: DbxInstructionAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={className} aria-label="DBX payment instruction panel">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between rounded-xl border border-[rgba(94,23,235,0.25)] bg-[#09091F] px-3 py-3 text-left text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#C084FC]"
        aria-expanded={open}
      >
        <span>DBX transfer instructions</span>
        <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>

      {open ? (
        <div className="mt-3">
          <DbxWalletInstruction instruction={instruction} />
        </div>
      ) : null}
    </section>
  );
}