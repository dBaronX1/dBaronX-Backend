interface NormalizationMatrixProps {
  title: string;
  mapping: Record<string, string>;
}

export function NormalizationMatrix({
  title,
  mapping,
}: NormalizationMatrixProps) {
  const entries = Object.entries(mapping);

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold">{title}</h2>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              <th className="border-b px-3 py-2 font-semibold text-neutral-700">
                Source
              </th>
              <th className="border-b px-3 py-2 font-semibold text-neutral-700">
                Normalized
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([source, normalized]) => (
              <tr key={source}>
                <td className="border-b px-3 py-2 text-neutral-700">{source}</td>
                <td className="border-b px-3 py-2 text-neutral-700">{normalized}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
