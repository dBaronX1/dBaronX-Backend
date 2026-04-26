interface DependencyMapPanelProps {
  title: string;
  mapping: Record<
    string,
    {
      dependsOn?: string[];
      role?: string;
    }
  >;
}

export function DependencyMapPanel({
  title,
  mapping,
}: DependencyMapPanelProps) {
  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {Object.entries(mapping).map(([service, config]) => (
          <article key={service} className="rounded-2xl border p-4">
            <p className="text-sm font-semibold">{service}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-neutral-500">
              role: {config.role ?? "n/a"}
            </p>

            <div className="mt-3">
              <p className="text-xs font-medium text-neutral-600">depends on</p>
              <ul className="mt-2 space-y-1 text-sm text-neutral-700">
                {(config.dependsOn ?? []).map((dependency) => (
                  <li
                    key={dependency}
                    className="rounded-lg bg-neutral-50 px-2.5 py-1.5"
                  >
                    {dependency}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
