interface EmptyStateCardProps {
  title: string;
  description: string;
}

export function EmptyStateCard({
  title,
  description,
}: EmptyStateCardProps) {
  return (
    <section className="rounded-2xl border border-dashed bg-white p-6 text-center shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-neutral-600">{description}</p>
    </section>
  );
}
