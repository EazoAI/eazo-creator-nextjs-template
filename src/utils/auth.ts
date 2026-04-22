import { NextRequest, NextResponse } from "next/server";
import { decryptUserInfo } from "@eazo/node-sdk";
import type { UserInfo } from "@/components/user-profile/types";

type AuthSuccess = { ok: true; user: UserInfo };
type AuthFailure = { ok: false; response: NextResponse };
type AuthResult = AuthSuccess | AuthFailure;

/**
 * Extracts and decrypts the Eazo session token from the request header.
 *
 * Clients must pass the encrypted payload as a JSON-serialised string in:
 *   X-Eazo-Session: <JSON of { encryptedData, encryptedKey, iv, authTag }>
 *
 * Returns { ok: true, user } on success, or { ok: false, response } with a
 * ready-to-return NextResponse on failure.
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const privateKey = process.env.EAZO_PRIVATE_KEY;
  if (!privateKey) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "EAZO_PRIVATE_KEY is not configured" },
        { status: 500 }
      ),
    };
  }

  const header = request.headers.get("x-eazo-session");
  if (!header) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Missing x-eazo-session header" },
        { status: 401 }
      ),
    };
  }

  let payload: Record<string, string>;
  try {
    payload = JSON.parse(header);
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Invalid x-eazo-session header — expected JSON" },
        { status: 401 }
      ),
    };
  }

  const { encryptedData, encryptedKey, iv, authTag } = payload;
  if (!encryptedData || !encryptedKey || !iv || !authTag) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Incomplete session payload" },
        { status: 401 }
      ),
    };
  }

  try {
    const user = decryptUserInfo({ encryptedData, encryptedKey, iv, authTag, privateKey });
    return { ok: true, user };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Decryption failed";
    return {
      ok: false,
      response: NextResponse.json({ error: message }, { status: 401 }),
    };
  }
}
