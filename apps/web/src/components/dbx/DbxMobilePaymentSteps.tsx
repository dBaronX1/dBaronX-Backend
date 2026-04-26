interface DbxMobilePaymentStepsProps {
  className?: string;
}

const steps = [
  "Create a DBX payment intent.",
  "Copy the treasury wallet and exact DBX amount.",
  "Send DBX from your Solana wallet.",
  "Paste the confirmed Solana transaction signature.",
  "Wait for verification and order sync.",
];

export function DbxMobilePaymentSteps({
  className = "",
}: DbxMobilePaymentStepsProps) {
  return (
    <div
      className={`rounded-xl border border-[rgba(94,23,235,0.20)] bg-[#09091F] p-3 ${className}`}
      aria-label="How to pay with DBX"
    >
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#C084FC]">
        Mobile payment steps
      </p>
      <ol className="mt-3 space-y-2">
        {steps.map((step, index) => (
          <li key={step} className="flex gap-2 text-xs leading-relaxed text-white/65">
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5E17EB] text-[10px] font-bold text-white"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}