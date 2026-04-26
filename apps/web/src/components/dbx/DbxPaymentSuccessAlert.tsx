interface DbxPaymentSuccessAlertProps {
  reference: string;
  className?: string;
}

export function DbxPaymentSuccessAlert({
  reference,
  className = "",
}: DbxPaymentSuccessAlertProps) {
  return (
    <div
      className={`rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-100 ${className}`}
      role="status"
      aria-live="polite"
    >
      <p className="font-bold">DBX payment completed</p>
      <p className="mt-1 leading-relaxed">
        Payment reference <span className="font-mono">{reference}</span> has been verified and completed.
      </p>
    </div>
  );
}