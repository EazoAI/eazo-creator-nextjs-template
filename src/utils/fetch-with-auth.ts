import { requestBridgeApi } from "./eazo-bridge";

// Cache the session payload for the lifetime of the page to avoid
// calling the bridge on every request.
let cachedSession: string | null = null;

async function getSessionHeader(): Promise<string> {
  if (cachedSession) return cachedSession;
  const payload = await requestBridgeApi("session.getToken");
  cachedSession = JSON.stringify(payload);
  return cachedSession;
}

/**
 * Drop-in replacement for `fetch` that automatically injects the Eazo
 * session token into the `x-eazo-session` request header.
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const session = await getSessionHeader();
  return fetch(input, {
    ...init,
    headers: {
      ...init.headers,
      "x-eazo-session": session,
    },
  });
}
