"use client";

import { useEffect } from "react";
import { useEazo } from "@eazo/sdk/react";
import type { EazoState } from "@eazo/sdk";
import i18n, {
  getLocalePreference,
  normalizeLocale,
  resolveLocalePreference,
  syncDocumentLanguage,
} from "@/i18n";

const selectDeviceLocale = (state: EazoState) => state.device.locale;

async function syncSystemLocale() {
  if (getLocalePreference() !== "system") return;

  const systemLocale = resolveLocalePreference("system");
  const active = normalizeLocale(i18n.resolvedLanguage || i18n.language);
  if (active === systemLocale) return;

  await i18n.changeLanguage(systemLocale);
  syncDocumentLanguage(i18n.language);
}

export function LocaleSyncEffect() {
  const deviceLocale = useEazo(selectDeviceLocale);

  useEffect(() => {
    void syncSystemLocale();
  }, [deviceLocale]);

  useEffect(() => {
    const handleLanguageChange = () => void syncSystemLocale();
    window.addEventListener("languagechange", handleLanguageChange);
    return () => window.removeEventListener("languagechange", handleLanguageChange);
  }, []);

  return null;
}
