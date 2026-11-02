import "server-only";
import type { User } from "@eazo/sdk/server";

const ALIAS = /^[a-z0-9][a-z0-9_-]{0,31}$/;

function enabled() {
  return process.env.NODE_ENV === "development" && process.env.EAZO_DEV_MOCK_AUTH === "1";
}

export function getDevUser(raw: string | null): User | null {
  if (!enabled() || !raw) return null;
  try {
    const session = JSON.parse(raw);
    const alias: unknown = session?.__eazoDevUser;
    if (Object.keys(session).length !== 1 || typeof alias !== "string" || alias === "none" || ALIAS.exec(alias)?.[0] !== alias) {
      return null;
    }
    return {
      id: `__eazo_dev__${alias}`,
      name: alias,
      email: `${alias}@preview.invalid`,
      avatarUrl: null,
    };
  } catch {
    return null;
  }
}

export function getDevAuthScript(): string | null {
  if (!enabled()) return null;
  // Run before the SDK reads its web session; host-provided identities stay intact.
  return `(() => {
    if (window !== window.top || window.ReactNativeWebView) return;
    try {
      const key = "eazo.session";
      const alias = new URLSearchParams(location.search).get("__dev_user");
      if (alias === "none") {
        localStorage.removeItem(key);
      } else if (alias !== null) {
        if (new RegExp(${JSON.stringify(ALIAS.source)}).exec(alias)?.[0] === alias) {
          localStorage.setItem(key, JSON.stringify({ __eazoDevUser: alias }));
        }
      } else if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({ __eazoDevUser: "preview" }));
      }
    } catch {}
  })();`;
}
