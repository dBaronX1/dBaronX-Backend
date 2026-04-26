interface SurfaceHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  secondary?: React.ReactNode;
}

export function SurfaceHero({
  eyebrow,
  title,
  description,
  secondary,
}: SurfaceHeroProps) {
  return (
    <section className="rounded-[28px] border bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
            {eyebrow}
          </p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            {title}
          </h1>
          <p className="text-sm text-neutral-600 md:text-base">{description}</p>
        </div>
        {secondary ? <div className="shrink-0">{secondary}</div> : null}
      </div>
    </section>
  );
}
