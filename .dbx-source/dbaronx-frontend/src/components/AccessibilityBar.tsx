"use client";
import React, { useState, useEffect } from "react";

interface AccessibilitySettings {
  highContrast: boolean;
  reduceMotion: boolean;
}

export default function AccessibilityBar() {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    highContrast: false,
    reduceMotion: false,
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("dbaronx-a11y");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AccessibilitySettings;
        setSettings(parsed);
        applySettings(parsed);
      } catch {}
    }
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      const updated = { highContrast: false, reduceMotion: true };
      setSettings(updated);
      applySettings(updated);
    }
  }, []);

  function applySettings(s: AccessibilitySettings) {
    const root = document.documentElement;
    if (s.highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }
    if (s.reduceMotion) {
      root.classList.add("reduce-motion");
    } else {
      root.classList.remove("reduce-motion");
    }
  }

  function toggle(key: keyof AccessibilitySettings) {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    applySettings(updated);
    localStorage.setItem("dbaronx-a11y", JSON.stringify(updated));
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:bg-primary focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-bold focus:outline-none focus:ring-2 focus:ring-accent"
      >
        Skip to main content
      </a>

      <button
        onClick={() => setVisible(!visible)}
        className="fixed bottom-20 right-4 z-50 w-10 h-10 rounded-full bg-primary border border-accent/30 flex items-center justify-center shadow-lg hover:bg-primary-light transition-all focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-base"
        aria-label="Accessibility options"
        aria-expanded={visible}
        aria-haspopup="true"
      >
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </button>

      {visible && (
        <div
          role="dialog"
          aria-label="Accessibility settings"
          aria-modal="true"
          className="fixed bottom-32 right-4 z-50 bg-bg-card border border-[rgba(94,23,235,0.3)] rounded-2xl p-4 w-64 shadow-xl"
        >
          <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <span aria-hidden="true">♿</span> Accessibility
          </h2>

          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-xs text-fg-muted group-hover:text-white transition-colors">
                High Contrast Mode
              </span>
              <button
                role="switch"
                aria-checked={settings.highContrast}
                onClick={() => toggle("highContrast")}
                className={`relative w-10 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
                  settings.highContrast ? "bg-accent" : "bg-[rgba(255,255,255,0.1)]"
                }`}
                aria-label="Toggle high contrast mode"
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.highContrast ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </label>

            <label className="flex items-center justify-between cursor-pointer group">
              <span className="text-xs text-fg-muted group-hover:text-white transition-colors">
                Reduce Motion
              </span>
              <button
                role="switch"
                aria-checked={settings.reduceMotion}
                onClick={() => toggle("reduceMotion")}
                className={`relative w-10 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
                  settings.reduceMotion ? "bg-accent" : "bg-[rgba(255,255,255,0.1)]"
                }`}
                aria-label="Toggle reduce motion"
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.reduceMotion ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </label>
          </div>

          <button
            onClick={() => setVisible(false)}
            className="mt-3 w-full text-xs text-fg-muted hover:text-white transition-colors py-1 focus:outline-none focus:ring-2 focus:ring-accent rounded"
            aria-label="Close accessibility panel"
          >
            Close
          </button>
        </div>
      )}
    </>
  );
}
