import { type NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

/**
 * GET /api/user/profile
 *
 * Returns the authenticated user's profile for both environments:
 *   Eazo Mobile  — authenticates via x-eazo-session header (encrypted payload)
 *   Web (GenAuth) — authenticates via Authorization: Bearer <JWT> (JWKS-verified)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response;
  return NextResponse.json({ ok: true, user: auth.user });
}
