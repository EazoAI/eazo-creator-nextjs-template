import { fetchWithAuth } from "./fetch-with-auth";
import type { UserInfo } from "@/components/user-profile/types";

export async function fetchUserProfile(): Promise<UserInfo | null> {
  try {
    const res = await fetchWithAuth("/api/user/profile");
    if (!res.ok) return null;
    const json = await res.json();
    return json.ok ? (json.user as UserInfo) : null;
  } catch {
    return null;
  }
}
