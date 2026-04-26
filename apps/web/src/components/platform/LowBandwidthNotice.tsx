"use client";

import { Gauge, WifiOff } from "lucide-react";
import { useLowBandwidthProfile } from "@/hooks/useLowBandwidthProfile";

export function LowBandwidthNotice() {
  const profile = useLowBandwidthProfile();

  if (!profile.enabled) {
    return null;
  }

  return (
    <section
      aria-live="polite"
      className="rounded-2xl border border-sky-300 bg-sky-50 p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-sky-900">
            Low-bandwidth mode active
          </h2>
          <p className="mt-1 text-sm text-sky-800">
            Heavy media, non-essential animations, and aggressive background
            refresh should be reduced on this device.
          </p>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-sky-900">
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1">
              <Gauge className="h-3.5 w-3.5" />
              effectiveType: {profile.effectiveType}
            </span>
            <span className="rounded-full bg-white px-2.5 py-1">
              saveData: {profile.saveData ? "on" : "off"}
            </span>
            <span className="rounded-full bg-white px-2.5 py-1">
              reducedMotion: {profile.reducedMotion ? "on" : "off"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
