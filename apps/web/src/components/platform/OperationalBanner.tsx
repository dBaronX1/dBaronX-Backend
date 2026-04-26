interface OperationalBannerProps {
  title: string;
  description: string;
  tone?: "neutral" | "success" | "warning";
}

export function OperationalBanner({
  title,
  description,
  tone = "neutral",
}: OperationalBannerProps) {
  const toneClass =
    tone === "success"
      ? "border-emerald-300 bg-emerald-50"
      : tone === "warning"
        ? "border-amber-300 bg-amber-50"
        : "border-neutral-200 bg-white";

  return (
    <section className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-neutral-700">{description}</p>
    </section>
  );
}
