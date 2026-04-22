import { NextRequest, NextResponse } from "next/server";
import { authServer } from "./server";
import type { UserInfo, SessionToken } from "@eazo/auth";

type AuthResult = { ok: true; user: UserInfo } | { ok: false; response: NextResponse };

/**
 * Next.js auth guard. Parses x-eazo-session from the request and delegates
 * decryption to EazoAuthServer.verifySession — works for both Eazo Mobile
 * and Web (both send the same encrypted session shape).
 */
export function requireAuth(request: NextRequest): AuthResult {
  const raw = request.headers.get("x-eazo-session");
  if (!raw) {
    return { ok: false, response: NextResponse.json({ error: "Missing x-eazo-session" }, { status: 401 }) };
  }

  let session: SessionToken;
  try {
    session = JSON.parse(raw) as SessionToken;
  } catch {
    return { ok: false, response: NextResponse.json({ error: "Invalid x-eazo-session" }, { status: 401 }) };
  }

  try {
    const user = authServer.verifySession(session);
    return { ok: true, user };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unauthorized";
    const status = msg.includes("privateKey") ? 500 : 401;
    return { ok: false, response: NextResponse.json({ error: msg }, { status }) };
  }
}
