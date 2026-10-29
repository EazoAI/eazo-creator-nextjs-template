"use client";

import { toast } from "sonner";

import {
  APP_AI_UNAVAILABLE_MESSAGE,
  AppAIPlatformUnavailableError,
  AppAIRequestError,
  parseAppAIErrorDetail,
} from "@/lib/app-ai/error-types";

const APP_AI_UNAVAILABLE_TOAST_ID = "app-ai-unavailable";

export { APP_AI_UNAVAILABLE_MESSAGE };

/** Platform-side App AI outage — common Sonner toast already shown. */
export class AppAIClientUnavailableError extends Error {
  readonly code = "app_ai_unavailable";
  readonly debugId?: string;

  constructor(message = APP_AI_UNAVAILABLE_MESSAGE, debugId?: string) {
    super(message);
    this.name = "AppAIClientUnavailableError";
    this.debugId = debugId;
  }
}

/** Developer/user-attributed App AI error — show {@link message} in feature UI. */
export class AppAIClientVisibleError extends Error {
  readonly code: string;
  readonly reasonCode: string;
  readonly debugId?: string;

  constructor(source: AppAIRequestError) {
    super(source.message);
    this.name = "AppAIClientVisibleError";
    this.code = source.code;
    this.reasonCode = source.reasonCode;
    this.debugId = source.debugId;
  }
}

/**
 * Browser wrapper for App-owned API routes that invoke App AI server-side.
 * Platform failures get the shared toast; client-attributed errors surface to
 * the feature component with the English message from Creator.
 */
export async function appAIRequest(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init);
  if (response.ok) return response;

  let body: unknown = null;
  try {
    body = await response.clone().json();
  } catch {
    if (response.status === 402) {
      toast.error(APP_AI_UNAVAILABLE_MESSAGE, { id: APP_AI_UNAVAILABLE_TOAST_ID });
      throw new AppAIClientUnavailableError();
    }
    return response;
  }

  const parsed = parseAppAIErrorDetail(body, response.status);
  if (!parsed) return response;

  if (parsed instanceof AppAIPlatformUnavailableError || parsed.isPlatformFallback) {
    toast.error(parsed.message, { id: APP_AI_UNAVAILABLE_TOAST_ID });
    throw new AppAIClientUnavailableError(parsed.message, parsed.debugId);
  }

  throw new AppAIClientVisibleError(parsed);
}
