import { auth } from "@eazo/sdk";

/**
 * Drop-in replacement for `fetch` that automatically injects `x-eazo-session`.
 * The SDK resolves the current session header from either the host bridge
 * (Eazo Mobile) or localStorage (web).
 */
export async function request(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const sessionHeader = await auth.getSessionHeader();

  return fetch(input, {
    ...init,
    headers: {
      ...init.headers,
      ...(sessionHeader ? { "x-eazo-session": sessionHeader } : {}),
    },
  });
}
