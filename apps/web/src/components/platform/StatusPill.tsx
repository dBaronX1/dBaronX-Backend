interface StatusPillProps {
  ready: boolean;
  readyLabel?: string;
  blockedLabel?: string;
}

export function StatusPill({
  ready,
  readyLabel = "Ready",
  blockedLabel = "Blocked",
}: StatusPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        ready
          ? "bg-emerald-100 text-emerald-800"
          : "bg-amber-100 text-amber-800"
      }`}
    >
      {ready ? readyLabel : blockedLabel}
    </span>
  );
}
