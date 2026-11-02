import { requireAuth as sdkRequireAuth, type AuthResult } from "@eazo/sdk/server";
import { getDevUser } from "./dev";

export function requireAuth(request: Parameters<typeof sdkRequireAuth>[0]): AuthResult {
  const user = getDevUser(request.headers.get("x-eazo-session"));
  return user ? { ok: true, user } : sdkRequireAuth(request);
}

export type { User, AuthResult } from "@eazo/sdk/server";
