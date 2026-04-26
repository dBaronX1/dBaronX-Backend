"use client";

import { useState } from "react";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";

export default function AiStoriesCreatePage() {
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [channel, setChannel] = useState("social");
  const [spend, setSpend] = useState("25");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="AI Stories Creator"
        title="Campaign Creation Surface"
        description="Frontend creator surface for AI story campaign drafting, targeting, and promotion budget planning."
      />

      <LowBandwidthNotice />

      <SurfaceTabs
        tabs={[
          { href: "/ai-stories-create", label: "Create" },
          { href: "/ai-stories-dashboard", label: "Dashboard" },
          { href: "/ai-stories-review", label: "Review" },
          { href: "/campaigns", label: "Campaigns" },
        ]}
      />

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium">Campaign Title</span>
            <input
              aria-label="Campaign title"
              className="rounded-xl border px-3 py-2"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Enter campaign title"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium">Prompt / Creative Direction</span>
            <textarea
              aria-label="Prompt or creative direction"
              className="min-h-36 rounded-xl border px-3 py-2"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe the story direction, audience, and desired tone"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium">Target Channel</span>
              <select
                aria-label="Target channel"
                className="rounded-xl border px-3 py-2"
                value={channel}
                onChange={(event) => setChannel(event.target.value)}
              >
                <option value="social">Social</option>
                <option value="landing-page">Landing Page</option>
                <option value="affiliate">Affiliate</option>
                <option value="ads">Ads</option>
              </select>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium">Budget</span>
              <input
                aria-label="Budget"
                className="rounded-xl border px-3 py-2"
                value={spend}
                onChange={(event) => setSpend(event.target.value)}
                inputMode="decimal"
              />
            </label>
          </div>

          <div
            role="status"
            aria-live="polite"
            className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600"
          >
            Draft preview only in this phase. Final submission wiring should connect to the
            canonical NestJS AI Stories campaign orchestration surface.
          </div>
        </div>
      </section>
    </main>
  );
}
