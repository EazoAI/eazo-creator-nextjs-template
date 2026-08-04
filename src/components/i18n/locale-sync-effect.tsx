"use client";

import { useEffect } from "react";
import i18n, {
  getLocalePreference,
  normalizeLocale,
  resolveLocalePreference,
  syncDocumentLanguage,
} from "@/i18n";

export function LocaleSyncEffect() {
  useEffect(() => {
    const syncSystemLocale = async () => {
      if (getLocalePreference() !== "system") return;

      const systemLocale = resolveLocalePreference("system");
      const active = normalizeLocale(i18n.resolvedLanguage || i18n.language);
      if (active === systemLocale) return;

      await i18n.changeLanguage(systemLocale);
      syncDocumentLanguage(i18n.language);
    };

    const handleLanguageChange = () => void syncSystemLocale();
    window.addEventListener("languagechange", handleLanguageChange);
    return () => window.removeEventListener("languagechange", handleLanguageChange);
  }, []);

  return null;
}
