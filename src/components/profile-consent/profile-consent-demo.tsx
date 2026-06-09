"use client";

import { auth } from "@eazo/sdk";
import { useEazo } from "@eazo/sdk/react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ProfileConsentButton } from "@/components/auth/profile-consent-button";
import { ProfileFieldRow } from "./profile-field-row";

/**
 * Demo: WeChat-style scoped profile consent.
 *
 * By default the app only knows the anonymous user `id`. Nickname/avatar
 * (`profile` scope) and email (`email` scope) stay `null` until the user
 * approves a consent popup via `auth.requestProfile([...])`. This card shows
 * the locked → revealed transition and how to read `grantedScopes` reactively.
 */
export function ProfileConsentDemo() {
  const { t } = useTranslation();
  const user = useEazo((s) => s.auth.user);
  const loading = useEazo((s) => s.auth.loading);
  const grantedScopes = useEazo((s) => s.auth.grantedScopes);

  if (loading) return null;

  if (!user) {
    return (
      <section className="mx-auto w-full max-w-md rounded-2xl border bg-card/60 p-6 shadow-sm">
        <h2 className="text-base font-medium">{t("profileConsent.title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("profileConsent.signInHint")}
        </p>
        <Button className="mt-4" onClick={() => auth.login().catch(() => undefined)}>
          {t("common.signIn")}
        </Button>
      </section>
    );
  }

  const hasProfile = grantedScopes.includes("profile");
  const hasEmail = grantedScopes.includes("email");

  return (
    <section className="mx-auto w-full max-w-md rounded-2xl border bg-card/60 p-6 shadow-sm">
      <h2 className="text-base font-medium">{t("profileConsent.title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("profileConsent.subtitle")}
      </p>

      <div className="mt-4 divide-y divide-border rounded-xl border bg-background px-4">
        <ProfileFieldRow label={t("common.userId")} value={user.id} locked={false} />
        <ProfileFieldRow
          label={t("profileConsent.avatar")}
          value={user.avatarUrl}
          locked={!hasProfile}
          avatar
        />
        <ProfileFieldRow
          label={t("profileConsent.nickname")}
          value={user.name}
          locked={!hasProfile}
        />
        <ProfileFieldRow
          label={t("profileConsent.email")}
          value={user.email}
          locked={!hasEmail}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <ProfileConsentButton
          scopes={["profile"]}
          label={t("profileConsent.revealProfile")}
        />
        <ProfileConsentButton
          scopes={["email"]}
          label={t("profileConsent.revealEmail")}
        />
      </div>

      {hasProfile && hasEmail && (
        <p className="mt-3 text-xs text-muted-foreground">
          {t("profileConsent.allGranted")}
        </p>
      )}
    </section>
  );
}
