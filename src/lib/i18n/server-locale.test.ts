import { expect, test } from "bun:test";
import type { LocaleCode } from "./locale";
import { localeFromAcceptLanguage } from "./server-locale";

const cases: Array<[string | null, LocaleCode]> = [
  [null, "en-US"],
  ["zh-CN,zh;q=0.9,en;q=0.8", "zh-CN"],
  ["en-US,zh-CN;q=0.9", "en-US"],
  ["fr-FR,zh-TW;q=0.8,en;q=0.5", "zh-CN"],
  ["en;q=0.4,zh-Hans;q=0.9", "zh-CN"],
  ["zh-CN;q=0,de", "en-US"],
];

test("picks the highest-q supported Accept-Language locale", () => {
  for (const [header, expected] of cases) {
    expect(localeFromAcceptLanguage(header)).toBe(expected);
  }
});
