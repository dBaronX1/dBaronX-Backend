"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

type Locale = "en" | "ar" | "fr" | "tw";

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  isRTL: boolean;
  languages: { code: Locale; label: string; nativeLabel: string }[];
  detectedCountry: string | null;
  preferredCurrency: string;
  preferredPayment: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const RTL_LOCALES: Locale[] = ["ar"];

export const LANGUAGES = [
  { code: "en" as Locale, label: "English", nativeLabel: "English" },
  { code: "ar" as Locale, label: "Arabic", nativeLabel: "العربية" },
  { code: "fr" as Locale, label: "French", nativeLabel: "Français" },
  { code: "tw" as Locale, label: "Twi", nativeLabel: "Twi (Ghana)" },
];

const COUNTRY_LOCALE_MAP: Record<string, Locale> = {
  GH: "tw", NG: "en", KE: "en", ZA: "en",
  AE: "ar", SA: "ar", EG: "ar", MA: "ar", DZ: "ar", TN: "ar", LY: "ar", JO: "ar", LB: "ar", IQ: "ar", KW: "ar", QA: "ar", BH: "ar", OM: "ar",
  FR: "fr", BE: "fr", CH: "fr", SN: "fr", CI: "fr", CM: "fr", ML: "fr", BF: "fr", TG: "fr", BJ: "fr", NE: "fr", CD: "fr", CG: "fr", GA: "fr",
};

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  GH: "GHS", NG: "NGN", KE: "KES", ZA: "ZAR",
  AE: "AED", SA: "SAR", EG: "EGP",
  US: "USD", GB: "GBP", EU: "EUR", FR: "EUR", DE: "EUR",
  JP: "JPY", CN: "CNY", IN: "INR", BR: "BRL",
};

const COUNTRY_PAYMENT_MAP: Record<string, string> = {
  GH: "mobile_money", NG: "mobile_money", KE: "mobile_money", SN: "mobile_money",
  AE: "solana_pay", SA: "solana_pay", US: "solana_pay", GB: "solana_pay",
};

const translationCache: Record<string, Record<string, unknown>> = {};

async function loadTranslations(locale: Locale): Promise<Record<string, unknown>> {
  if (translationCache[locale]) return translationCache[locale];
  try {
    const res = await fetch(`/locales/${locale}.json`);
    if (!res.ok) throw new Error("Failed to load");
    const data = await res.json();
    translationCache[locale] = data;
    return data;
  } catch {
    return {};
  }
}

function getNestedValue(obj: Record<string, unknown>, key: string): string {
  const parts = key.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof current === "string" ? current : key;
}

async function detectCountryFromIP(): Promise<string | null> {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.country_code || null;
  } catch {
    try {
      const res2 = await fetch("https://api.country.is/", { signal: AbortSignal.timeout(3000) });
      if (!res2.ok) return null;
      const data2 = await res2.json();
      return data2?.country || null;
    } catch {
      return null;
    }
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [translations, setTranslations] = useState<Record<string, unknown>>({});
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [preferredCurrency, setPreferredCurrency] = useState("USD");
  const [preferredPayment, setPreferredPayment] = useState("solana_pay");

  useEffect(() => {
    const initLocale = async () => {
      const saved = localStorage.getItem("dbaronx-locale") as Locale | null;
      const savedCountry = localStorage.getItem("dbaronx-country");

      if (saved) {
        setLocaleState(saved);
        if (savedCountry) {
          setDetectedCountry(savedCountry);
          setPreferredCurrency(COUNTRY_CURRENCY_MAP[savedCountry] || "USD");
          setPreferredPayment(COUNTRY_PAYMENT_MAP[savedCountry] || "solana_pay");
        }
        return;
      }

      const countryCode = await detectCountryFromIP();
      if (countryCode) {
        setDetectedCountry(countryCode);
        localStorage.setItem("dbaronx-country", countryCode);
        setPreferredCurrency(COUNTRY_CURRENCY_MAP[countryCode] || "USD");
        setPreferredPayment(COUNTRY_PAYMENT_MAP[countryCode] || "solana_pay");

        const detectedLocale = COUNTRY_LOCALE_MAP[countryCode];
        if (detectedLocale) {
          setLocaleState(detectedLocale);
          return;
        }
      }

      const browserLang = navigator.language.split("-")[0] as Locale;
      const supported: Locale[] = ["en", "ar", "fr", "tw"];
      setLocaleState(supported.includes(browserLang) ? browserLang : "en");
    };

    initLocale();
  }, []);

  useEffect(() => {
    loadTranslations(locale).then(setTranslations);
    document.documentElement.setAttribute("dir", RTL_LOCALES.includes(locale) ? "rtl" : "ltr");
    document.documentElement.setAttribute("lang", locale);
    localStorage.setItem("dbaronx-locale", locale);
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
  }, []);

  const t = useCallback(
    (key: string): string => {
      return getNestedValue(translations, key);
    },
    [translations]
  );

  const isRTL = RTL_LOCALES.includes(locale);

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t, isRTL, languages: LANGUAGES, detectedCountry, preferredCurrency, preferredPayment }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
