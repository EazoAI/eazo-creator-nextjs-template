"use client";

import { useTranslation } from "react-i18next";
import { UserBadge } from "@/components/user-profile/user-badge";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

const STEP_KEYS = [
  "readDocs",
  "replacePage",
  "firstFeature",
  "translations",
] as const;

export function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,theme(colors.orange.500/0.18),transparent_50%)]"
      />

      <header className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <LanguageSwitcher />
        <UserBadge />
      </header>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-10 px-6 py-20 md:px-10">
        <section className="space-y-4 text-center md:text-left">
          <span className="inline-flex rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-600 dark:text-orange-300">
            {t("starter.badge")}
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl">
            {t("starter.title")}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            {t("starter.subtitle")}
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEP_KEYS.map((key) => (
            <article
              key={key}
              className="rounded-2xl border bg-card/60 p-5 shadow-sm backdrop-blur"
            >
              <h2 className="text-base font-medium">
                {t(`starter.steps.${key}.title`)}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t(`starter.steps.${key}.desc`)}
              </p>
              <code className="mt-4 inline-block rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                {t(`starter.steps.${key}.code`)}
              </code>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border bg-card/50 p-5 md:p-6">
          <h3 className="text-sm font-medium">{t("starter.nextCommand.title")}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("starter.nextCommand.desc")}
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-muted p-3 text-sm">
            <code>{t("starter.nextCommand.command")}</code>
          </pre>
        </section>
      </main>
    </div>
  );
}
