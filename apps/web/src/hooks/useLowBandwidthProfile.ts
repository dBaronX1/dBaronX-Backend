"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getLowBandwidthProfile,
  type LowBandwidthProfile,
} from "@/lib/platform/low-bandwidth";

export function useLowBandwidthProfile(): LowBandwidthProfile {
  const [profile, setProfile] = useState<LowBandwidthProfile>(() =>
    getLowBandwidthProfile(),
  );

  useEffect(() => {
    const update = () => setProfile(getLowBandwidthProfile());

    update();

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    mediaQuery.addEventListener?.("change", update);

    const connection = navigator.connection as
      | (EventTarget & { addEventListener?: (type: string, listener: () => void) => void; removeEventListener?: (type: string, listener: () => void) => void })
      | undefined;

    connection?.addEventListener?.("change", update);

    return () => {
      mediaQuery.removeEventListener?.("change", update);
      connection?.removeEventListener?.("change", update);
    };
  }, []);

  return useMemo(() => profile, [profile]);
}
