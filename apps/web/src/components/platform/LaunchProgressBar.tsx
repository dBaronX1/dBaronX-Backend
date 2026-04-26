interface LaunchProgressBarProps {
  complete: number;
  total: number;
  label?: string;
}

export function LaunchProgressBar({
  complete,
  total,
  label = "Launch progress",
}: LaunchProgressBarProps) {
  const safeTotal = total <= 0 ? 1 : total;
  const percentage = Math.max(0, Math.min(100, Math.round((complete / safeTotal) * 100)));

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{label}</h2>
        <span className="text-sm font-medium text-neutral-600">
          {complete}/{total}
        </span>
      </div>

      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-neutral-100">
        <div
          className="h-full rounded-full bg-neutral-900 transition-all"
          style={{ width: `${percentage}%` }}
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
          aria-label={label}
        />
      </div>

      <p className="mt-3 text-sm text-neutral-600">{percentage}% complete</p>
    </section>
  );
}
