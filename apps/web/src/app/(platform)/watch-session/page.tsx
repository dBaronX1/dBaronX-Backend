"use client";

import { useMemo, useState } from "react";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";

export default function WatchSessionPage() {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [captchaPassed, setCaptchaPassed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const rewardState = useMemo(() => {
    if (elapsedSeconds < 20) return "insufficient_watch_time";
    if (!captchaPassed) return "captcha_required";
    if (!confirmed) return "confirmation_required";
    return "eligible";
  }, [elapsedSeconds, captchaPassed, confirmed]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Watch Session"
        title="Watch Session Lifecycle Surface"
        description="Frontend watch-session surface for elapsed time, CAPTCHA step, confirmation state, and reward eligibility."
      />

      <LowBandwidthNotice />

      <SurfaceTabs
        tabs={[
          { href: "/watch-dashboard", label: "Dashboard" },
          { href: "/watch-review", label: "Review" },
          { href: "/watch-session", label: "Session" },
          { href: "/ads-interaction", label: "Interaction" },
        ]}
      />

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-4">
          <article className="rounded-2xl border p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Elapsed Seconds
            </p>
            <p className="mt-2 text-2xl font-bold">{elapsedSeconds}</p>
          </article>

          <article className="rounded-2xl border p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              CAPTCHA
            </p>
            <p className="mt-2 text-2xl font-bold">
              {captchaPassed ? "Passed" : "Required"}
            </p>
          </article>

          <article className="rounded-2xl border p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Confirmation
            </p>
            <p className="mt-2 text-2xl font-bold">
              {confirmed ? "Confirmed" : "Pending"}
            </p>
          </article>

          <article className="rounded-2xl border p-4">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Reward State
            </p>
            <p className="mt-2 text-lg font-bold break-words">{rewardState}</p>
          </article>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
            onClick={() => setElapsedSeconds((value) => value + 5)}
          >
            +5 seconds
          </button>
          <button
            className="rounded-full border px-4 py-2 text-sm font-medium"
            onClick={() => setCaptchaPassed(true)}
          >
            CAPTCHA passed
          </button>
          <button
            className="rounded-full border px-4 py-2 text-sm font-medium"
            onClick={() => setConfirmed(true)}
          >
            Confirm reward
          </button>
          <button
            className="rounded-full border px-4 py-2 text-sm font-medium"
            onClick={() => {
              setElapsedSeconds(0);
              setCaptchaPassed(false);
              setConfirmed(false);
            }}
          >
            Reset
          </button>
        </div>

        <div
          role="status"
          aria-live="polite"
          className="mt-5 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600"
        >
          Session simulation only in this phase. Final reward authorization must remain server-driven through FastAPI intelligence and NestJS economic decisions.
        </div>
      </section>
    </main>
  );
}
