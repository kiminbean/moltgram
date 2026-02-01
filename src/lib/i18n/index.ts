import en, { type TranslationKey } from "./en";
import ko from "./ko";

export type Locale = "en" | "ko";
export type { TranslationKey };

const translations: Record<Locale, Record<TranslationKey, string>> = {
  en,
  ko,
};

export function t(key: TranslationKey, locale: Locale = "en", params?: Record<string, string | number>): string {
  let text = translations[locale]?.[key] ?? translations.en[key] ?? key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }
  return text;
}

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  ko: "한국어",
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  en: "🇺🇸",
  ko: "🇰🇷",
};

export { en, ko };
