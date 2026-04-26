import Link from "next/link";
import { StatusPill } from "@/components/platform/StatusPill";

interface DomainSurfaceCardProps {
  title: string;
  description: string;
  href: string;
  ready?: boolean;
  metrics?: Array<{ label: string; value: string | number }>;
}

export function DomainSurfaceCard({
  title,
  description,
  href,
  ready = false,
  metrics = [],
}: DomainSurfaceCardProps) {
  return (
    <Link
      href={href}
      className="rounded-2xl border bg-white p-4 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-neutral-600">{description}</p>
        </div>
        <StatusPill ready={ready} />
      </div>

      {metrics.length > 0 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="rounded-xl bg-neutral-50 px-3 py-2"
            >
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                {metric.label}
              </p>
              <p className="mt-1 text-sm font-semibold">{metric.value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </Link>
  );
}
