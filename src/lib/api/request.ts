"use client";

import { auth } from "@eazo/sdk";
import { getResolvedLocale } from "@/i18n";
import { appAIRequest } from "@/lib/api/app-ai-request";

/**
 * Drop-in replacement for `fetch` that automatically injects `x-eazo-session`
 * and owns the common App AI unavailable toast for authenticated API calls.
 * The SDK resolves the current session header from either the host bridge
 * (Eazo Mobile) or localStorage (web).
 */
export async function request(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const sessionHeader = await auth.getSessionHeader();
  const headers = new Headers(init.headers);
  if (sessionHeader) headers.set("x-eazo-session", sessionHeader);
  headers.set("x-app-locale", getResolvedLocale());

  return appAIRequest(input, {
    ...init,
    headers,
  });
}
