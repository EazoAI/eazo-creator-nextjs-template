import { request } from "./request";
import type { UserInfo } from "@eazo/auth";

export async function fetchUserProfile(): Promise<UserInfo | null> {
  try {
    const res = await request("/api/user/profile");
    if (!res.ok) return null;
    const json = await res.json() as { ok: boolean; user: UserInfo };
    return json.ok ? json.user : null;
  } catch {
    return null;
  }
}
