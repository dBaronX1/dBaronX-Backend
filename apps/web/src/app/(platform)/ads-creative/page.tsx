"use client";

import { useMemo, useState } from "react";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";

export default function AdsCreativePage() {
  const [headline, setHeadline] = useState("");
  const [cta, setCta] = useState("Shop now");
  const [budget, setBudget] = useState("100");
  const [placement, setPlacement] = useState("feed");

  const preview = useMemo(
    () => ({
      headline,
      cta,
      budget,
      placement,
      note: "Creative drafting surface only in this phase.",
    }),
    [headline, cta, budget, placement],
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Ads Creative"
        title="Ad Creative Drafting Surface"
        description="Frontend creative drafting surface for campaign copy, CTA, placement, and budget planning."
      />

      <LowBandwidthNotice />

      <SurfaceTabs
        tabs={[
          { href: "/ads-dashboard", label: "Dashboard" },
          { href: "/ads-review", label: "Review" },
          { href: "/ads-creative", label: "Creative" },
          { href: "/campaign-studio", label: "Campaign Studio" },
        ]}
      />

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium">Headline</span>
            <input
              className="rounded-xl border px-3 py-2"
              value={headline}
              onChange={(event) => setHeadline(event.target.value)}
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2">
              <span className="text-sm font-medium">CTA</span>
              <input
                className="rounded-xl border px-3 py-2"
                value={cta}
                onChange={(event) => setCta(event.target.value)}
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">Placement</span>
              <select
                className="rounded-xl border px-3 py-2"
                value={placement}
                onChange={(event) => setPlacement(event.target.value)}
              >
                <option value="feed">Feed</option>
                <option value="story">Story</option>
                <option value="video">Video</option>
                <option value="search">Search</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">Budget</span>
              <input
                className="rounded-xl border px-3 py-2"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                inputMode="decimal"
              />
            </label>
          </div>

          <pre className="overflow-x-auto rounded-2xl bg-neutral-50 p-4 text-xs text-neutral-700">
            {JSON.stringify(preview, null, 2)}
          </pre>
        </div>
      </section>
    </main>
  );
}
