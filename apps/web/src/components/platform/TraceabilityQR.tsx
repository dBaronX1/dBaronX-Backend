"use client";

import { useMemo, useState } from "react";

interface TraceabilityQRProps {
  title: string;
  productId: string;
  lotCode: string;
  origin: string;
}

function buildTraceabilityUrl(productId: string, lotCode: string, origin: string) {
  const query = new URLSearchParams({
    product: productId,
    lot: lotCode,
    origin,
  });

  return `/traceability?${query.toString()}`;
}

export function TraceabilityQR({ title, productId, lotCode, origin }: TraceabilityQRProps) {
  const [copied, setCopied] = useState(false);

  const traceabilityUrl = useMemo(
    () => buildTraceabilityUrl(productId, lotCode, origin),
    [lotCode, origin, productId],
  );

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
      <p className="mt-1 text-sm text-neutral-600">Generate low-bandwidth trace payload for inspections and dispute resolution.</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[180px_1fr]">
        <div className="flex h-[180px] w-[180px] items-center justify-center rounded-2xl border bg-neutral-50 p-3">
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <span className="rounded bg-neutral-900 px-2 py-1 text-white">PRD</span>
            <span className="rounded bg-neutral-900 px-2 py-1 text-white">LOT</span>
            <span className="rounded bg-neutral-200 px-2 py-1">{productId.slice(0, 8)}</span>
            <span className="rounded bg-neutral-200 px-2 py-1">{lotCode.slice(0, 8)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <dl className="grid gap-2 text-sm text-neutral-700">
            <div className="grid grid-cols-[110px_1fr] gap-2">
              <dt className="font-medium text-neutral-500">Product ID</dt>
              <dd className="break-all">{productId}</dd>
            </div>
            <div className="grid grid-cols-[110px_1fr] gap-2">
              <dt className="font-medium text-neutral-500">Lot Code</dt>
              <dd className="break-all">{lotCode}</dd>
            </div>
            <div className="grid grid-cols-[110px_1fr] gap-2">
              <dt className="font-medium text-neutral-500">Origin</dt>
              <dd>{origin}</dd>
            </div>
          </dl>

          <div className="rounded-xl bg-neutral-50 p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-neutral-500">Trace payload</p>
            <p className="mt-1 break-all text-xs text-neutral-700">{traceabilityUrl}</p>
          </div>

          <button
            type="button"
            className="rounded-xl border px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            onClick={async () => {
              await navigator.clipboard.writeText(traceabilityUrl);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1200);
            }}
          >
            {copied ? "Copied trace payload" : "Copy trace payload"}
          </button>
        </div>
      </div>
    </section>
  );
}
