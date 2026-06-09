import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { upsertUser } from "@/lib/db/queries";

/**
 * GET /api/user/profile
 * Decrypts the x-eazo-session header and returns the authenticated user's profile.
 * Works for both Eazo Mobile and Web — both send the same encrypted session shape.
 * Also upserts the user into the local DB so user info is always up to date.
 */
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  const { user, grantedScopes } = auth;

  // Upsert in the background — don't block the response on DB latency.
  // Only persist PII fields the user has actually granted; otherwise keep id-only.
  upsertUser({
    id: user.id,
    email: grantedScopes.includes("email") ? user.email : null,
    name: grantedScopes.includes("profile") ? user.name : null,
    avatarUrl: grantedScopes.includes("profile") ? user.avatarUrl : null,
  }).catch((err) => {
    console.error("[profile] upsertUser failed", err);
  });

  return NextResponse.json({ ok: true, user, grantedScopes });
}
