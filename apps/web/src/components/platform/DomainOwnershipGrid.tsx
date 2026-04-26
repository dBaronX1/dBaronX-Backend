interface DomainOwnershipGridProps {
  domains: Record<
    string,
    {
      sourceOfTruth: string;
      mirroredInto: string;
      allowedFields: string[];
    }
  >;
}

export function DomainOwnershipGrid({
  domains,
}: DomainOwnershipGridProps) {
  const entries = Object.entries(domains);

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {entries.map(([domain, config]) => (
        <article key={domain} className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="space-y-1">
            <h2 className="text-base font-semibold capitalize">{domain}</h2>
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              source of truth: {config.sourceOfTruth}
            </p>
            <p className="text-xs text-neutral-600">
              mirrored into: {config.mirroredInto}
            </p>
          </div>

          <div className="mt-4">
            <p className="text-sm font-medium">Allowed fields</p>
            <ul className="mt-2 space-y-1 text-sm text-neutral-700">
              {config.allowedFields.map((field) => (
                <li key={field} className="rounded-lg bg-neutral-50 px-2.5 py-1.5">
                  {field}
                </li>
              ))}
            </ul>
          </div>
        </article>
      ))}
    </section>
  );
}
