"use client";

import { useState } from "react";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";

export default function AdsInteractionPage() {
  const [seconds, setSeconds] = useState(0);
  const [completed, setCompleted] = useState(false);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Ads Interaction"
        title="Watch Session and Ad Interaction Surface"
        description="Frontend interaction surface for ad engagement states, watch progress, and anti-abuse-friendly completion behavior."
      />

      <LowBandwidthNotice />

      <SurfaceTabs
        tabs={[
          { href: "/watch-dashboard", label: "Watch Dashboard" },
          { href: "/watch-review", label: "Watch Review" },
          { href: "/ads-dashboard", label: "Ads Dashboard" },
          { href: "/ads-interaction", label: "Interaction" },
        ]}
      />

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="space-y-4">
          <div className="rounded-2xl bg-neutral-100 p-10 text-center text-sm text-neutral-600">
            Video / creative placeholder
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Watched Seconds
              </p>
              <p className="mt-2 text-2xl font-bold">{seconds}</p>
            </article>

            <article className="rounded-2xl border p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Completion State
              </p>
              <p className="mt-2 text-2xl font-bold">
                {completed ? "Complete" : "In Progress"}
              </p>
            </article>

            <article className="rounded-2xl border p-4">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Reward Eligibility
              </p>
              <p className="mt-2 text-2xl font-bold">
                {completed ? "Eligible" : "Pending"}
              </p>
            </article>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
              onClick={() => setSeconds((value) => value + 5)}
            >
              +5 seconds
            </button>
            <button
              className="rounded-full border px-4 py-2 text-sm font-medium"
              onClick={() => setCompleted(true)}
            >
              Mark complete
            </button>
            <button
              className="rounded-full border px-4 py-2 text-sm font-medium"
              onClick={() => {
                setSeconds(0);
                setCompleted(false);
              }}
            >
              Reset
            </button>
          </div>

          <div
            role="status"
            aria-live="polite"
            className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600"
          >
            Interaction demo only in this phase. Final watch completion, CAPTCHA,
            anti-abuse, and reward confirmation must stay tied to FastAPI/NestJS backend decisions.
          </div>
        </div>
      </section>
    </main>
  );
}
