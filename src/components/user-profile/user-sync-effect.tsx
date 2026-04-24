"use client";

import { useEffect, useRef } from "react";
import { auth } from "@eazo/sdk";
import { useEazo } from "@eazo/sdk/react";

/**
 * Syncs the authenticated user to the local DB after a successful login,
 * by calling GET /api/user/profile — the same endpoint the Web path uses.
 *
 * - Web path: SDK calls /api/user/profile during bootstrap to fetch the user,
 *   which already triggers the upsert there.
 * - Mobile path: auth bootstraps from the bridge hello message and never calls
 *   /api/user/profile automatically, so this effect fires it once after login.
 *
 * Mount this once inside <EazoProvider> (already done in layout.tsx).
 */
export function UserSyncEffect() {
  const authenticated = useEazo((s) => s.auth.authenticated);
  const platform = useEazo((s) => s.device.platform);
  const syncedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!authenticated || platform !== "mobile") return;

    const userId = auth.user?.id ?? null;
    if (!userId || syncedUserId.current === userId) return;

    syncedUserId.current = userId;

      (async () => {
      try {
        const sessionHeader = await auth.getSessionHeader();
        if (!sessionHeader) return;

        await fetch("/api/user/profile", {
          headers: { "x-eazo-session": sessionHeader },
        });
      } catch (err) {
        console.error("[UserSyncEffect] profile fetch failed", err);
      }
    })();
  }, [authenticated, platform]);

  return null;
}
