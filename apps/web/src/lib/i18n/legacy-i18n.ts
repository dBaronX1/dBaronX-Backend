import ar from "@/lib/i18n/locales/ar.json";
import en from "@/lib/i18n/locales/en.json";
import fr from "@/lib/i18n/locales/fr.json";
import tw from "@/lib/i18n/locales/tw.json";

export const LEGACY_LOCALE_CODES = ["en", "fr", "ar", "tw"] as const;

export type LegacyLocaleCode = (typeof LEGACY_LOCALE_CODES)[number];

type LocaleMessages = typeof en;

export const LEGACY_LOCALES: Record<LegacyLocaleCode, LocaleMessages> = {
  en,
  fr,
  ar,
  tw,
};

export const LEGACY_LOCALE_META: Record<
  LegacyLocaleCode,
  { label: string; nativeLabel: string; dir: "ltr" | "rtl" }
> = {
  en: { label: "English", nativeLabel: "English", dir: "ltr" },
  fr: { label: "French", nativeLabel: "Français", dir: "ltr" },
  ar: { label: "Arabic", nativeLabel: "العربية", dir: "rtl" },
  tw: { label: "Twi", nativeLabel: "Twi", dir: "ltr" },
};

export function isLegacyLocale(value: string): value is LegacyLocaleCode {
  return LEGACY_LOCALE_CODES.includes(value as LegacyLocaleCode);
}

export function getLegacyMessages(locale: LegacyLocaleCode): LocaleMessages {
  return LEGACY_LOCALES[locale];
}
