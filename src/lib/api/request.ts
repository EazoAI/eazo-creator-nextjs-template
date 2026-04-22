import { getSession } from "@/utils/token";

/**
 * Drop-in replacement for `fetch` that automatically injects `x-eazo-session`.
 * Works for both Eazo Mobile and Web — the session is always in localStorage
 * after initAuth (mobile: seeded from bridge, web: saved on login).
 */
export async function request(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const session = getSession();

  return fetch(input, {
    ...init,
    headers: {
      ...init.headers,
      ...(session ? { "x-eazo-session": JSON.stringify(session) } : {}),
    },
  });
}
