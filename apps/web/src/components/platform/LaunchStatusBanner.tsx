"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface LaunchStatusBannerProps {
  ready: boolean;
  blockers: string[];
  title?: string;
}

export function LaunchStatusBanner({
  ready,
  blockers,
  title = "Launch Status",
}: LaunchStatusBannerProps) {
  return (
    <section
      aria-live="polite"
      className={`rounded-2xl border p-4 shadow-sm ${
        ready
          ? "border-emerald-300 bg-emerald-50"
          : "border-amber-300 bg-amber-50"
      }`}
    >
      <div className="flex items-start gap-3">
        {ready ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
        ) : (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        )}

        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-sm">
            {ready
              ? "Core launch surfaces are currently green."
              : "There are unresolved blockers across launch-critical systems."}
          </p>

          {!ready && blockers.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm">
              {blockers.slice(0, 8).map((blocker) => (
                <li key={blocker} className="break-words">
                  • {blocker}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
