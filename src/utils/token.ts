import type { SessionToken } from "@eazo/auth";

const SESSION_KEY = "eazo.session";

export const getSession = (): SessionToken | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionToken;
  } catch {
    return null;
  }
};

export const setSession = (session: SessionToken): void =>
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

export const removeSession = (): void =>
  localStorage.removeItem(SESSION_KEY);
