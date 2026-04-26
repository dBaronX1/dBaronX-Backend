interface OperationalMetricCardProps {
  label: string;
  value: string | number;
  helper?: string;
}

export function OperationalMetricCard({
  label,
  value,
  helper,
}: OperationalMetricCardProps) {
  return (
    <article className="rounded-2xl border bg-white p-4 shadow-sm">
      <p className="text-sm text-neutral-600">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      {helper ? <p className="mt-2 text-xs text-neutral-500">{helper}</p> : null}
    </article>
  );
}
