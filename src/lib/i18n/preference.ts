import { device } from "@eazo/sdk";
import { normalizeLocale, type LocaleCode } from "@/lib/i18n/locale";

export const LOCALE_STORAGE_KEY = "eazo-app.locale.v1";

export type LocalePreference = LocaleCode | "system";

function isEmbeddedInFrame(): boolean {
  return typeof window !== "undefined" && window.parent !== window;
}

/**
 * In an iframe host (Creator preview) "system" is the host's `device.locale`;
 * the SDK only snapshots the browser language, so other pages read `navigator`.
 */
export function detectSystemLocale(): LocaleCode {
  if (isEmbeddedInFrame()) {
    const hostLocale = normalizeLocale(device.locale);
    if (hostLocale) return hostLocale;
  }

  const browserLanguages =
    typeof navigator !== "undefined"
      ? [navigator.language, ...(navigator.languages ?? [])]
      : [];
  for (const language of browserLanguages) {
    const locale = normalizeLocale(language);
    if (locale) return locale;
  }
  return "en-US";
}

export function parseLocalePreference(raw: string | null | undefined): LocalePreference {
  if (!raw) return "system";
  if (raw === "system") return "system";
  return normalizeLocale(raw) ?? "system";
}

export function resolveLocalePreference(preference: LocalePreference): LocaleCode {
  return preference === "system" ? detectSystemLocale() : preference;
}

function getBrowserStorage(): Storage | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage;
}

/** Read preference from localStorage (client only). */
export function getLocalePreference(): LocalePreference {
  const storage = getBrowserStorage();
  if (!storage) return "system";
  return parseLocalePreference(storage.getItem(LOCALE_STORAGE_KEY));
}

export function persistLocalePreference(preference: LocalePreference): void {
  getBrowserStorage()?.setItem(LOCALE_STORAGE_KEY, preference);
  if (typeof document !== "undefined") {
    document.cookie = `${LOCALE_STORAGE_KEY}=${encodeURIComponent(preference)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  }
}
