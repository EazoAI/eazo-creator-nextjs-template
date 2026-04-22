import { requestBridgeApi } from "@/lib/auth/eazo-bridge";
import { getToken } from "@/lib/auth/token";

/**
 * Returns true when running inside Eazo Mobile (WebView).
 * Eazo Mobile injects "EAZO" into the User-Agent string.
 */
export function isEazoMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.userAgent.includes("EAZO");
}

// Cache the bridge session payload for the lifetime of the page so we only
// call the bridge once per load (bridge calls are async + have a timeout).
let cachedEazoSession: string | null = null;

async function getEazoSessionHeader(): Promise<string> {
  if (cachedEazoSession) return cachedEazoSession;
  const payload = await requestBridgeApi("session.getToken");
  cachedEazoSession = JSON.stringify(payload);
  return cachedEazoSession;
}

/**
 * Drop-in replacement for `fetch` that automatically injects the correct
 * auth header depending on the runtime environment:
 *
 *   Eazo Mobile  → `x-eazo-session: <encrypted JSON payload>`
 *   Web          → `Authorization: Bearer <jwt>`
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const authHeaders: Record<string, string> = {};

  if (isEazoMobile()) {
    authHeaders["x-eazo-session"] = await getEazoSessionHeader();
  } else {
    const token = getToken();
    if (token) authHeaders["Authorization"] = `Bearer ${token}`;
  }

  return fetch(input, {
    ...init,
    headers: {
      ...init.headers,
      ...authHeaders,
    },
  });
}
