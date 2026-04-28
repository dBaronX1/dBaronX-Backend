"use client";
import React, { useState } from "react";
import { useLanguage, LANGUAGES } from "@/contexts/LanguageContext";

export default function LanguageSwitcher() {
  const { locale, setLocale, isRTL } = useLanguage();
  const [open, setOpen] = useState(false);

  const current = LANGUAGES?.find((l) => l?.code === locale) || LANGUAGES?.[0];

  return (
    <div className="relative" dir="ltr">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Select language"
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[rgba(94,23,235,0.3)] text-fg-muted hover:text-accent hover:border-accent/50 transition-all text-xs font-medium focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
        </svg>
        <span>{current?.nativeLabel}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Language options"
          className="absolute top-full mt-1 right-0 bg-bg-card border border-[rgba(94,23,235,0.3)] rounded-xl overflow-hidden shadow-xl z-50 min-w-[140px]"
        >
          {LANGUAGES?.map((lang) => (
            <button
              key={lang?.code}
              role="option"
              aria-selected={locale === lang?.code}
              onClick={() => { setLocale(lang?.code); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center gap-2 focus:outline-none focus:bg-primary/20 ${
                locale === lang?.code
                  ? "text-accent bg-accent/10" :"text-fg-muted hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="font-mono text-[10px] uppercase text-fg-muted w-6">{lang?.code}</span>
              <span>{lang?.nativeLabel}</span>
              {locale === lang?.code && (
                <svg className="w-3 h-3 ml-auto text-accent" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
