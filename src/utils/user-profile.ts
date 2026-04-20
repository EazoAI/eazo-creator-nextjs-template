import type { UserInfo } from "@/components/user-profile/types";
import { requestBridgeApi } from "./eazo-bridge";

export async function fetchUserProfile(): Promise<UserInfo> {
  console.log("[user-profile] fetching session token via bridge...");
  const payload = await requestBridgeApi("session.getToken");
  console.log("[user-profile] got encrypted payload, calling /api/user/profile...");

  const res = await fetch("/api/user/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  console.log("[user-profile] /api/user/profile responded", { status: res.status });
  const json = await res.json();
  console.log("[user-profile] response body", json);

  if (!json.ok) throw new Error(json.error ?? "Failed to fetch user profile");
  return json.user as UserInfo;
}
