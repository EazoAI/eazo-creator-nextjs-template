"use client";

import { useState } from "react";
import { auth } from "@eazo/sdk";
import type { AuthScope } from "@eazo/sdk";
import { useEazo } from "@eazo/sdk/react";
import { Button } from "@/components/ui/button";

/**
 * Reference WeChat-style profile-consent control.
 *
 * By default an Eazo app only knows the user's anonymous `id`. Nickname/avatar
 * (`profile` scope) and email (`email` scope) are withheld until the user
 * approves a consent popup triggered by `auth.requestProfile([...])`.
 *
 * Read granted scopes reactively with `useEazo((s) => s.auth.grantedScopes)`
 * and only render name/avatar/email once the matching scope is present.
 * Restyle or replace this control to fit your product surface.
 */
export function ProfileConsentButton({
  scopes = ["profile"],
  label = "Reveal name & avatar",
}: {
  scopes?: AuthScope[];
  label?: string;
}) {
  const user = useEazo((s) => s.auth.user);
  const grantedScopes = useEazo((s) => s.auth.grantedScopes);
  const [pending, setPending] = useState(false);

  if (!user) return null;

  const alreadyGranted = scopes.every((s) => grantedScopes.includes(s));
  if (alreadyGranted) return null;

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          // Pops a consent UI (web) or a native sheet (mobile); resolves with
          // the scoped User once approved, rejects if the user declines.
          await auth.requestProfile(scopes);
        } catch {
          // User declined — keep rendering id-only, no error surfaced.
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? "Requesting…" : label}
    </Button>
  );
}
