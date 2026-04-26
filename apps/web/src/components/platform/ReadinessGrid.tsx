"use client";

import type { ReadinessMatrix } from "@/lib/platform/backend-contracts";

interface ReadinessGridProps {
  matrix: ReadinessMatrix;
}

export function ReadinessGrid({ matrix }: ReadinessGridProps) {
  const entries = Object.entries(matrix);

  return (
    <section aria-labelledby="readiness-grid-title" className="space-y-4">
      <div>
        <h2 id="readiness-grid-title" className="text-lg font-semibold">
          Readiness Matrix
        </h2>
        <p className="text-sm text-neutral-600">
          Operational view of launch-critical domains.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {entries.map(([key, value]) => (
          <article
            key={key}
            className="rounded-2xl border bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold capitalize">
                {key.replace(/([A-Z])/g, " $1")}
              </h3>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  value.ready
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {value.ready ? "Ready" : "Blocked"}
              </span>
            </div>

            <pre className="mt-3 overflow-x-auto rounded-xl bg-neutral-50 p-3 text-xs text-neutral-700">
              {JSON.stringify(value.summary, null, 2)}
            </pre>
          </article>
        ))}
      </div>
    </section>
  );
}
