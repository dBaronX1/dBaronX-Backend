"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LEGACY_LOCALE_META,
  getLegacyMessages,
  isLegacyLocale,
  type LegacyLocaleCode,
} from "@/lib/i18n/legacy-i18n";

interface UserAccessibilityPreferences {
  locale: LegacyLocaleCode;
  highContrast: boolean;
  reduceMotion: boolean;
}

const DEFAULT_PREFERENCES: UserAccessibilityPreferences = {
  locale: "en",
  highContrast: false,
  reduceMotion: false,
};

const STORAGE_KEY = "dbaronx:web:locale-a11y";

function loadStoredPreferences(): UserAccessibilityPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PREFERENCES;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return DEFAULT_PREFERENCES;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<UserAccessibilityPreferences>;
    const locale = parsed.locale && isLegacyLocale(parsed.locale) ? parsed.locale : "en";

    return {
      locale,
      highContrast: Boolean(parsed.highContrast),
      reduceMotion: Boolean(parsed.reduceMotion),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function applyPreferences(preferences: UserAccessibilityPreferences) {
  const root = document.documentElement;
  const localeMeta = LEGACY_LOCALE_META[preferences.locale];

  root.lang = preferences.locale;
  root.dir = localeMeta.dir;
  root.classList.toggle("dbx-high-contrast", preferences.highContrast);
  root.classList.toggle("dbx-reduce-motion", preferences.reduceMotion);
}

export function LocaleAccessibilityControls() {
  const [preferences, setPreferences] = useState<UserAccessibilityPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const stored = loadStoredPreferences();

    if (!stored.reduceMotion && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      stored.reduceMotion = true;
    }

    setPreferences(stored);
    applyPreferences(stored);
  }, []);

  useEffect(() => {
    applyPreferences(preferences);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const copy = useMemo(() => {
    return getLegacyMessages(preferences.locale).accessibility;
  }, [preferences.locale]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href="#main-content"
        className="sr-only rounded-md bg-neutral-950 px-3 py-2 text-xs font-semibold text-white focus:not-sr-only"
      >
        {copy.skip_to_content}
      </a>

      <label className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700">
        <span>{copy.language_select}</span>
        <select
          aria-label={copy.language_select}
          value={preferences.locale}
          onChange={(event) =>
            setPreferences((previous) => ({
              ...previous,
              locale: event.target.value as LegacyLocaleCode,
            }))
          }
          className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs"
        >
          {Object.entries(LEGACY_LOCALE_META).map(([code, locale]) => (
            <option key={code} value={code}>
              {locale.nativeLabel}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        aria-pressed={preferences.highContrast}
        onClick={() =>
          setPreferences((previous) => ({
            ...previous,
            highContrast: !previous.highContrast,
          }))
        }
        className={`rounded-xl border px-2 py-1 text-xs font-medium transition ${
          preferences.highContrast
            ? "border-neutral-900 bg-neutral-900 text-white"
            : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500"
        }`}
      >
        {copy.high_contrast}
      </button>

      <button
        type="button"
        aria-pressed={preferences.reduceMotion}
        onClick={() =>
          setPreferences((previous) => ({
            ...previous,
            reduceMotion: !previous.reduceMotion,
          }))
        }
        className={`rounded-xl border px-2 py-1 text-xs font-medium transition ${
          preferences.reduceMotion
            ? "border-neutral-900 bg-neutral-900 text-white"
            : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500"
        }`}
      >
        {copy.reduce_motion}
      </button>

      <style jsx global>{`
        .dbx-high-contrast {
          filter: contrast(125%);
        }

        .dbx-reduce-motion *,
        .dbx-reduce-motion *::before,
        .dbx-reduce-motion *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      `}</style>
    </div>
  );
}
