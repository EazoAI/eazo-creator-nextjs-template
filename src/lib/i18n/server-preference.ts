import { cookies, headers } from "next/headers";
import {
  LOCALE_STORAGE_KEY,
  parseLocalePreference,
  resolveLocalePreference,
} from "@/lib/i18n/preference";
import type { LocaleCode } from "@/lib/i18n/locale";
import { localeFromAcceptLanguage } from "@/lib/i18n/server-locale";

/** Resolved locale for SSR (cookie → Accept-Language when system). */
export async function getServerLocale(): Promise<LocaleCode> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_STORAGE_KEY)?.value;
  const preference = parseLocalePreference(
    raw ? decodeURIComponent(raw) : null,
  );
  if (preference === "system") {
    const headerStore = await headers();
    return localeFromAcceptLanguage(headerStore.get("accept-language"));
  }
  return resolveLocalePreference(preference);
}
