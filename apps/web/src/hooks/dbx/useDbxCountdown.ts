"use client";

import { useEffect, useMemo, useState } from "react";

export function useDbxCountdown(expiresAt?: string | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [expiresAt]);

  return useMemo(() => {
    if (!expiresAt) {
      return {
        expired: false,
        secondsRemaining: 0,
        label: "",
      };
    }

    const expiry = new Date(expiresAt).getTime();
    const secondsRemaining = Math.max(0, Math.floor((expiry - now) / 1000));
    const expired = secondsRemaining <= 0;

    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;

    return {
      expired,
      secondsRemaining,
      label: expired
        ? "Expired"
        : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
    };
  }, [expiresAt, now]);
}