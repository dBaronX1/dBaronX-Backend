interface JsonPanelProps {
  title: string;
  payload: unknown;
  description?: string;
}

export function JsonPanel({ title, payload, description }: JsonPanelProps) {
  return (
    <article className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? (
          <p className="text-sm text-neutral-600">{description}</p>
        ) : null}
      </div>

      <pre className="mt-4 overflow-x-auto rounded-xl bg-neutral-50 p-3 text-xs text-neutral-700">
        {JSON.stringify(payload, null, 2)}
      </pre>
    </article>
  );
}
