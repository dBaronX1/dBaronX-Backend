interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
}: SectionHeaderProps) {
  return (
    <header className="space-y-2">
      {eyebrow ? (
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {description ? (
        <p className="max-w-3xl text-sm text-neutral-600">{description}</p>
      ) : null}
    </header>
  );
}
