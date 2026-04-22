import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { decryptUserInfo } from "@eazo/node-sdk";
import type { UserInfo } from "@/components/user-profile/types";

type AuthSuccess = { ok: true; user: UserInfo };
type AuthFailure = { ok: false; response: NextResponse };
type AuthResult = AuthSuccess | AuthFailure;

function fail(message: string, status = 401): AuthFailure {
  return { ok: false, response: NextResponse.json({ error: message }, { status }) };
}

// ---------------------------------------------------------------------------
// JWKS — cached per process (createRemoteJWKSet handles in-memory caching)
// ---------------------------------------------------------------------------

let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (_jwks) return _jwks;
  const domain =
    process.env.NEXT_PUBLIC_GENAUTH_APP_DOMAIN ??
    process.env.NEXT_PUBLIC_AUTHING_APP_DOMAIN;
  if (!domain) throw new Error("Missing NEXT_PUBLIC_GENAUTH_APP_DOMAIN env var");
  _jwks = createRemoteJWKSet(new URL(`${domain}/oidc/.well-known/jwks.json`));
  return _jwks;
}

// ---------------------------------------------------------------------------
// Unified server-side auth
//
//   Eazo Mobile  → UA contains "EAZO", reads encrypted session from x-eazo-session header
//   Web (GenAuth) → Authorization: Bearer <JWT>, verified with JWKS
// ---------------------------------------------------------------------------

export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const ua = request.headers.get("user-agent") ?? "";
  return ua.includes("EAZO")
    ? requireEazoMobileAuth(request)
    : requireWebAuth(request);
}

// ── Eazo Mobile ─────────────────────────────────────────────────────────────

async function requireEazoMobileAuth(request: NextRequest): Promise<AuthResult> {
  const privateKey = process.env.EAZO_PRIVATE_KEY;
  if (!privateKey) return fail("EAZO_PRIVATE_KEY is not configured", 500);

  const header = request.headers.get("x-eazo-session");
  if (!header) return fail("Missing x-eazo-session header");

  let payload: Record<string, string>;
  try {
    payload = JSON.parse(header);
  } catch {
    return fail("Invalid x-eazo-session header — expected JSON");
  }

  const { encryptedData, encryptedKey, iv, authTag } = payload;
  if (!encryptedData || !encryptedKey || !iv || !authTag) {
    return fail("Incomplete session payload");
  }

  try {
    const user = decryptUserInfo({ encryptedData, encryptedKey, iv, authTag, privateKey });
    return { ok: true, user };
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Decryption failed");
  }
}

// ── Web (GenAuth Bearer JWT + JWKS verification) ─────────────────────────────

async function requireWebAuth(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return fail("Missing Authorization header");

  try {
    const jwks = getJWKS();
    const { payload } = await jwtVerify(token, jwks, {
      // Mirror Python deps.py: verify exp but skip aud/iss checks
      clockTolerance: 30,
    });

    const userId = String(payload.sub ?? (payload as Record<string, unknown>).userId ?? "");
    if (!userId) return fail("Token missing subject");

    const p = payload as Record<string, unknown>;
    const user: UserInfo = {
      userId,
      email: p.email as string | undefined,
      nickname: (p.nickname ?? p.name ?? p.username) as string | undefined,
      avatarUrl: (p.picture ?? p.photo ?? p.avatar) as string | undefined,
    };
    return { ok: true, user };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("exp") || msg.toLowerCase().includes("expir")) {
      return fail("Token expired");
    }
    return fail(`Invalid token: ${msg}`);
  }
}
