import type { DbxPaymentStatus } from "@/types/dbx/dbx-payment.types";

interface DbxPaymentTimelineProps {
  status: DbxPaymentStatus;
  className?: string;
}

const steps = [
  {
    key: "pending",
    label: "Intent",
    description: "Payment intent created",
  },
  {
    key: "submitted",
    label: "Submitted",
    description: "Signature received",
  },
  {
    key: "verified",
    label: "Verified",
    description: "Solana transfer confirmed",
  },
  {
    key: "completed",
    label: "Complete",
    description: "Order sync finished",
  },
] as const;

function activeIndex(status: DbxPaymentStatus): number {
  switch (status) {
    case "pending":
      return 0;
    case "submitted":
      return 1;
    case "verified":
    case "verified_pending_order_sync":
      return 2;
    case "completed":
      return 3;
    case "expired":
    case "failed":
    default:
      return -1;
  }
}

export function DbxPaymentTimeline({
  status,
  className = "",
}: DbxPaymentTimelineProps) {
  const current = activeIndex(status);
  const failed = status === "failed" || status === "expired";

  return (
    <ol
      className={`grid grid-cols-4 gap-2 ${className}`}
      aria-label="DBX payment progress"
    >
      {steps.map((step, index) => {
        const done = current >= index;
        const currentStep = current === index;

        return (
          <li key={step.key} className="min-w-0">
            <div
              className={[
                "h-1.5 rounded-full",
                done && !failed ? "bg-[#C084FC]" : "bg-white/15",
                currentStep && !failed ? "shadow-[0_0_16px_rgba(192,132,252,0.60)]" : "",
              ].join(" ")}
              aria-hidden="true"
            />
            <p className="mt-2 truncate text-[11px] font-semibold text-white">
              {step.label}
            </p>
            <p className="hidden text-[10px] text-white/40 sm:block">
              {step.description}
            </p>
          </li>
        );
      })}
    </ol>
  );
}