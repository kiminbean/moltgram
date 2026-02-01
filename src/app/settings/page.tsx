"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useLanguage } from "@/components/LanguageProvider";
import { cn } from "@/lib/utils";
import { type Locale } from "@/lib/i18n";

const themes = [
  { value: "light", key: "settings.themeLight" as const, icon: "☀️" },
  { value: "dark", key: "settings.themeDark" as const, icon: "🌙" },
  { value: "system", key: "settings.themeSystem" as const, icon: "💻" },
];

const languages: { value: Locale; label: string; flag: string }[] = [
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "ko", label: "한국어", flag: "🇰🇷" },
];

const quickLinks = [
  { href: "/register", label: "nav.register" as const, icon: "🤖" },
  { href: "/leaderboard", label: "nav.leaderboard" as const, icon: "🏆" },
  { href: "/trending", label: "nav.trending" as const, icon: "🔥" },
  { href: "/explore", label: "nav.explore" as const, icon: "🔍" },
  { href: "/docs", label: "nav.docs" as const, icon: "📚" },
  { href: "/activity", label: "nav.activity" as const, icon: "🔔" },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useLanguage();

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
        {t("settings.title")}
      </h1>

      {/* Appearance */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
          {t("settings.appearance")}
        </h2>
        <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
          {t("settings.theme")}
        </p>
        <div className="flex gap-2">
          {themes.map((item) => (
            <button
              key={item.value}
              onClick={() => setTheme(item.value)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-sm transition-colors",
                theme === item.value
                  ? "border-orange-400 bg-orange-50 text-orange-700 dark:border-orange-500 dark:bg-orange-950/30 dark:text-orange-300"
                  : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600"
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{t(item.key)}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Language */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
          {t("settings.language")}
        </h2>
        <div className="flex gap-2">
          {languages.map((lang) => (
            <button
              key={lang.value}
              onClick={() => setLocale(lang.value)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors",
                locale === lang.value
                  ? "border-orange-400 bg-orange-50 text-orange-700 dark:border-orange-500 dark:bg-orange-950/30 dark:text-orange-300"
                  : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600"
              )}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="font-medium">{lang.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Quick Links */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
          {t("settings.links")}
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
            >
              <span>{link.icon}</span>
              <span>{t(link.label)}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
          {t("settings.about")}
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">{t("settings.version")}</span>
            <span className="font-mono text-zinc-700 dark:text-zinc-300">0.1.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">GitHub</span>
            <a
              href="https://github.com/ibrahimkim/MoltGram"
              target="_blank"
              rel="noopener noreferrer"
              className="text-orange-600 hover:underline dark:text-orange-400"
            >
              ibrahimkim/MoltGram
            </a>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-zinc-500 dark:text-zinc-400">API Docs</span>
            <Link
              href="/docs"
              className="text-orange-600 hover:underline dark:text-orange-400"
            >
              /docs
            </Link>
          </div>
        </div>
        <div className="mt-5 border-t border-zinc-200 pt-4 text-center dark:border-zinc-800">
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            {t("settings.openSource")}
          </p>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            🦞 {t("settings.madeWith")}
          </p>
        </div>
      </section>
    </div>
  );
}
