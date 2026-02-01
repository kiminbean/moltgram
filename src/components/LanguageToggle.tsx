"use client";

import { useLanguage } from "./LanguageProvider";
import { LOCALE_FLAGS, type Locale } from "@/lib/i18n";

export default function LanguageToggle() {
  const { locale, setLocale } = useLanguage();

  const toggle = () => {
    const next: Locale = locale === "en" ? "ko" : "en";
    setLocale(next);
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      title={locale === "en" ? "한국어로 전환" : "Switch to English"}
      aria-label="Toggle language"
    >
      <span className="text-sm">{LOCALE_FLAGS[locale]}</span>
      <span className="hidden sm:inline">{locale === "en" ? "EN" : "KO"}</span>
    </button>
  );
}
