import { NextResponse } from "next/server";
import { decryptUserInfo } from "@eazo/node-sdk";

export async function POST(request: Request) {
  const privateKey = process.env.EAZO_PRIVATE_KEY;
  if (!privateKey) {
    return NextResponse.json(
      { ok: false, error: "EAZO_PRIVATE_KEY is not configured" },
      { status: 500 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { encryptedData, encryptedKey, iv, authTag } = payload as Record<
    string,
    string
  >;

  if (!encryptedData || !encryptedKey || !iv || !authTag) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields: encryptedData, encryptedKey, iv, authTag" },
      { status: 400 }
    );
  }

  try {
    const user = decryptUserInfo({ encryptedData, encryptedKey, iv, authTag, privateKey });
    return NextResponse.json({ ok: true, user });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Decryption failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
