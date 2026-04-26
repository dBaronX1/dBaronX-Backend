"use client";

import { useMemo, useState } from "react";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";

export default function AiStoriesPromotionPage() {
  const [budget, setBudget] = useState("50");
  const [channel, setChannel] = useState("social");
  const [locale, setLocale] = useState("global");
  const [headline, setHeadline] = useState("");

  const preview = useMemo(
    () => ({
      headline,
      channel,
      locale,
      budget,
      note: "Promotion draft only. Final orchestration must use canonical NestJS AI Stories campaign endpoints.",
    }),
    [headline, channel, locale, budget],
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="AI Stories Promotion"
        title="Promotion Planning Surface"
        description="Frontend AI Stories promotion surface for budget, channel, locale, and campaign preparation."
      />

      <LowBandwidthNotice />

      <SurfaceTabs
        tabs={[
          { href: "/ai-stories-create", label: "Create" },
          { href: "/ai-stories-dashboard", label: "Dashboard" },
          { href: "/ai-stories-promotion", label: "Promotion" },
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
              <span className="text-sm font-medium">Channel</span>
              <select
                className="rounded-xl border px-3 py-2"
                value={channel}
                onChange={(event) => setChannel(event.target.value)}
              >
                <option value="social">Social</option>
                <option value="affiliate">Affiliate</option>
                <option value="landing-page">Landing Page</option>
                <option value="ads">Ads</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">Locale</span>
              <input
                className="rounded-xl border px-3 py-2"
                value={locale}
                onChange={(event) => setLocale(event.target.value)}
              />
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
