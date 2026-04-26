interface DbxPaymentSyncPendingAlertProps {
  reference: string;
  className?: string;
}

export function DbxPaymentSyncPendingAlert({
  reference,
  className = "",
}: DbxPaymentSyncPendingAlertProps) {
  return (
    <div
      className={`rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-100 ${className}`}
      role="status"
      aria-live="polite"
    >
      <p className="font-bold">Payment verified, order sync pending</p>
      <p className="mt-1 leading-relaxed">
        DBX transfer <span className="font-mono">{reference}</span> is verified. Order completion is queued for safe retry.
      </p>
    </div>
  );
}