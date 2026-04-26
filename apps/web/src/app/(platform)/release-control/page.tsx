"use client";

import { useMemo, useState } from "react";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";

export default function ReleaseControlPage() {
  const [frontendClosed, setFrontendClosed] = useState(false);
  const [launchClosed, setLaunchClosed] = useState(false);
  const [medusaClosed, setMedusaClosed] = useState(false);

  const ready = useMemo(
    () => frontendClosed && launchClosed && medusaClosed,
    [frontendClosed, launchClosed, medusaClosed],
  );

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Release Control"
        title="Release Decision Simulation Surface"
        description="Frontend simulation surface for release decision staging across frontend, launch, and Medusa closure states."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Release state"
        description={ready ? "Release conditions simulated as ready." : "Release conditions remain open."}
        tone={ready ? "success" : "warning"}
      />

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={frontendClosed}
              onChange={(event) => setFrontendClosed(event.target.checked)}
            />
            <span className="text-sm">Frontend closure complete</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={launchClosed}
              onChange={(event) => setLaunchClosed(event.target.checked)}
            />
            <span className="text-sm">Launch closure complete</span>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={medusaClosed}
              onChange={(event) => setMedusaClosed(event.target.checked)}
            />
            <span className="text-sm">Medusa closure complete</span>
          </label>
        </div>
      </section>
    </main>
  );
}
