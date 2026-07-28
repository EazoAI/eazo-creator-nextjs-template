"use client";

/** Reference locale control — restyle or fork for your app's header/settings UI. Keep changeLocale() wiring. */

import { useEffect, useState } from "react";
import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  changeLocale,
  getLocalePreference,
  normalizeLocale,
  supportedLocales,
  type LocaleCode,
  type LocalePreference,
} from "@/i18n";

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const [preference, setPreference] = useState<LocalePreference>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
      setPreference(getLocalePreference());
    });
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const sync = () => setPreference(getLocalePreference());
    i18n.on("languageChanged", sync);
    window.addEventListener("eazo-locale-preference-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      i18n.off("languageChanged", sync);
      window.removeEventListener("eazo-locale-preference-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, [i18n, mounted]);

  if (!mounted) {
    return (
      <div
        className="flex h-8 w-[100px] items-center gap-1.5 rounded-full border border-border bg-background px-2 shadow-sm"
        aria-hidden
      />
    );
  }

  const activeLocale =
    normalizeLocale(i18n.resolvedLanguage || i18n.language) ?? "en-US";
  const resolvedLabel =
    supportedLocales.find((l) => l.code === activeLocale)?.nativeLabel ?? activeLocale;

  async function handleChange(value: string) {
    if (value === "system") {
      await changeLocale("system");
      return;
    }
    const locale = normalizeLocale(value);
    if (locale) await changeLocale(locale as LocaleCode);
  }

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-2 py-1 shadow-sm">
      <Languages className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <label htmlFor="app-locale" className="sr-only">
        {t("language.label")}
      </label>
      <select
        id="app-locale"
        value={preference}
        onChange={(e) => void handleChange(e.target.value)}
        className="max-w-[140px] cursor-pointer truncate bg-transparent text-xs font-medium text-foreground outline-none"
        title={
          preference === "system"
            ? t("language.followSystemWithLanguage", { language: resolvedLabel })
            : resolvedLabel
        }
      >
        <option value="system">{t("language.followSystem")}</option>
        <option value="en-US">{t("language.enUS")}</option>
        <option value="zh-CN">{t("language.zhCN")}</option>
      </select>
    </div>
  );
}
