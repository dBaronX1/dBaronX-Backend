"use client";

import { useCallback, useRef, useState } from "react";

export function useClipboard(timeoutMs = 1400) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (value: string, key = "default") => {
      const text = String(value || "");

      if (!text) {
        return false;
      }

      if (!navigator?.clipboard?.writeText) {
        return false;
      }

      await navigator.clipboard.writeText(text);

      setCopiedKey(key);

      if (timer.current) {
        clearTimeout(timer.current);
      }

      timer.current = setTimeout(() => {
        setCopiedKey(null);
      }, timeoutMs);

      return true;
    },
    [timeoutMs],
  );

  const isCopied = useCallback(
    (key = "default") => copiedKey === key,
    [copiedKey],
  );

  return {
    copiedKey,
    copy,
    isCopied,
  };
}