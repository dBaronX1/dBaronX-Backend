import { dbxErrorRecoveryHint, userFacingDbxError } from "@/lib/checkout/dbx/dbx-checkout-errors";

interface DbxPaymentErrorAlertProps {
  error: unknown;
  className?: string;
}

export function DbxPaymentErrorAlert({
  error,
  className = "",
}: DbxPaymentErrorAlertProps) {
  if (!error) return null;

  return (
    <div
      className={`rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-100 ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <p className="font-bold">DBX payment needs attention</p>
      <p className="mt-1 leading-relaxed">{userFacingDbxError(error)}</p>
      <p className="mt-2 text-red-100/75">{dbxErrorRecoveryHint(error)}</p>
    </div>
  );
}