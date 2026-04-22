import { AuthenticationClient } from "authing-js-sdk";

// Lazily instantiated so that this module is safe to import server-side
// (Next.js will tree-shake it; the value is only used in client components).
let _client: AuthenticationClient | null = null;

export function getAuthingClient(): AuthenticationClient {
  if (_client) return _client;

  const appId = process.env.NEXT_PUBLIC_GENAUTH_APP_ID;
  const appHost = process.env.NEXT_PUBLIC_GENAUTH_APP_DOMAIN;

  if (!appId || !appHost) {
    throw new Error(
      "Missing Authing config. Set NEXT_PUBLIC_GENAUTH_APP_ID and NEXT_PUBLIC_GENAUTH_APP_DOMAIN in .env"
    );
  }

  _client = new AuthenticationClient({
    appId,
    appHost,
  });

  return _client;
}
