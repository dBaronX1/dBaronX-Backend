import { dbxDisplayAmount } from "@/lib/dbx/dbx-amount";

interface DbxAmountCardProps {
  baseUnits: string;
  usdCents?: number;
  className?: string;
}

export function DbxAmountCard({
  baseUnits,
  usdCents,
  className = "",
}: DbxAmountCardProps) {
  const usd =
    typeof usdCents === "number" && Number.isFinite(usdCents)
      ? new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: "USD",
        }).format(usdCents / 100)
      : null;

  return (
    <div
      className={`rounded-xl border border-[rgba(94,23,235,0.20)] bg-[#09091F] p-3 ${className}`}
      aria-label="DBX payment amount"
    >
      <p className="text-xs font-semibold text-white/60">Amount</p>
      <p className="mt-1 text-lg font-bold text-white">
        {dbxDisplayAmount(baseUnits, { maxFractionDigits: 6 })}
      </p>
      {usd ? <p className="mt-1 text-xs text-white/45">Checkout value: {usd}</p> : null}
      <p className="mt-1 break-all text-[11px] text-white/40">
        Base units: {baseUnits}
      </p>
    </div>
  );
}