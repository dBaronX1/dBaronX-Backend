export interface LowBandwidthProfile {
  enabled: boolean;
  mode: "auto" | "forced";
  saveData: boolean;
  effectiveType: string;
  reducedMotion: boolean;
}

declare global {
  interface Navigator {
    connection?: {
      saveData?: boolean;
      effectiveType?: string;
    };
  }
}

export function getLowBandwidthProfile(): LowBandwidthProfile {
  if (typeof window === "undefined") {
    return {
      enabled: false,
      mode: "auto",
      saveData: false,
      effectiveType: "unknown",
      reducedMotion: false,
    };
  }

  const saveData = Boolean(navigator.connection?.saveData);
  const effectiveType = navigator.connection?.effectiveType ?? "unknown";
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  const enabled =
    saveData ||
    reducedMotion ||
    ["slow-2g", "2g", "3g"].includes(effectiveType);

  return {
    enabled,
    mode: "auto",
    saveData,
    effectiveType,
    reducedMotion,
  };
}
