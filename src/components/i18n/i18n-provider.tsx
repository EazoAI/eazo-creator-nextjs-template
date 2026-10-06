"use client";

import { useEffect, useState } from "react";
import { I18nextProvider } from "react-i18next";
import i18n, {
  applyStoredLocalePreference,
  getResolvedLocale,
  type LocaleCode,
} from "@/i18n";

/**
 * Render the first pass in the SSR locale so hydration matches. The server
 * clones per request because concurrent renders must not share a language.
 */
function createRenderInstance(initialLocale: LocaleCode) {
  if (typeof window === "undefined") {
    return i18n.cloneInstance({ lng: initialLocale });
  }
  if (getResolvedLocale() !== initialLocale) {
    void i18n.changeLanguage(initialLocale);
  }
  return i18n;
}

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: LocaleCode;
}) {
  const [instance] = useState(() => createRenderInstance(initialLocale));

  useEffect(() => {
    void applyStoredLocalePreference();
  }, []);

  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
