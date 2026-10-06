import type { NextRequest } from "next/server";
import { normalizeLocale, type LocaleCode } from "@/lib/i18n/locale";

/** Pick the highest-q supported locale from an HTTP Accept-Language header. */
export function localeFromAcceptLanguage(
  headerValue: string | null | undefined,
): LocaleCode {
  const ranked = (headerValue ?? "")
    .split(",")
    .map((entry, index) => {
      const [tag = "", ...params] = entry.split(";").map((part) => part.trim());
      const qParam = params.find((param) => param.startsWith("q="));
      const quality = qParam ? Number(qParam.slice(2)) : 1;
      return { tag, quality: Number.isFinite(quality) ? quality : 0, index };
    })
    .filter(({ tag, quality }) => tag && quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  for (const { tag } of ranked) {
    const locale = normalizeLocale(tag);
    if (locale) return locale;
  }
  return "en-US";
}

export function getRequestLocale(request: NextRequest): LocaleCode {
  const fromHeader = normalizeLocale(request.headers.get("x-app-locale"));
  if (fromHeader) return fromHeader;

  return localeFromAcceptLanguage(request.headers.get("accept-language"));
}
