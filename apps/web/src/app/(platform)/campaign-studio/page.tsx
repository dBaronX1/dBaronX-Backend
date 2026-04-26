"use client";

import { useMemo, useState } from "react";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";

export default function CampaignStudioPage() {
  const [campaignType, setCampaignType] = useState<"ads" | "ai-stories">("ads");
  const [headline, setHeadline] = useState("");
  const [budget, setBudget] = useState("100");
  const [locale, setLocale] = useState("global");
  const [channels, setChannels] = useState("social, landing-page");

  const summary = useMemo(
    () => ({
      campaignType,
      headline,
      budget,
      locale,
      channels: channels
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    }),
    [campaignType, headline, budget, locale, channels],
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Campaign Studio"
        title="Ad and AI Story Campaign Drafting Surface"
        description="Unified frontend campaign drafting surface for ad budgets, AI story promotion planning, and orchestration-aware preparation."
      />

      <LowBandwidthNotice />

      <SurfaceTabs
        tabs={[
          { href: "/campaign-studio", label: "Studio" },
          { href: "/campaigns", label: "Campaigns" },
          { href: "/campaign-performance", label: "Performance" },
          { href: "/campaign-detail-links", label: "Detail Links" },
        ]}
      />

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium">Campaign Type</span>
            <select
              className="rounded-xl border px-3 py-2"
              value={campaignType}
              onChange={(event) =>
                setCampaignType(event.target.value as "ads" | "ai-stories")
              }
            >
              <option value="ads">Ads</option>
              <option value="ai-stories">AI Stories</option>
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium">Headline</span>
            <input
              className="rounded-xl border px-3 py-2"
              value={headline}
              onChange={(event) => setHeadline(event.target.value)}
              placeholder="Campaign headline"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2">
              <span className="text-sm font-medium">Budget</span>
              <input
                className="rounded-xl border px-3 py-2"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
                inputMode="decimal"
              />
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
              <span className="text-sm font-medium">Channels</span>
              <input
                className="rounded-xl border px-3 py-2"
                value={channels}
                onChange={(event) => setChannels(event.target.value)}
                placeholder="social, landing-page"
              />
            </label>
          </div>

          <div className="rounded-2xl bg-neutral-50 p-4">
            <p className="text-sm font-medium">Draft Summary</p>
            <pre className="mt-3 overflow-x-auto text-xs text-neutral-700">
              {JSON.stringify(summary, null, 2)}
            </pre>
          </div>
        </div>
      </section>
    </main>
  );
}
