export const APP_AI_UNAVAILABLE_MESSAGE =
  "AI is temporarily unavailable. Please try again later.";

export type AppAIAttribution = "client" | "platform";

type ErrorShape = {
  code?: string;
  message?: string;
  attribution?: string;
  reason_code?: string;
  debug_id?: string | null;
};

export class AppAIRequestError extends Error {
  readonly code: string;
  readonly reasonCode: string;
  readonly attribution: AppAIAttribution;
  readonly debugId?: string;

  constructor(payload: {
    code: string;
    reasonCode: string;
    message: string;
    attribution: AppAIAttribution;
    debugId?: string;
  }) {
    super(payload.message);
    this.name = "AppAIRequestError";
    this.code = payload.code;
    this.reasonCode = payload.reasonCode;
    this.attribution = payload.attribution;
    this.debugId = payload.debugId;
  }

  get isPlatformFallback(): boolean {
    return this.attribution === "platform" || this.code === "app_ai_unavailable";
  }
}

export class AppAIPlatformUnavailableError extends AppAIRequestError {
  constructor(message = APP_AI_UNAVAILABLE_MESSAGE, debugId?: string) {
    super({
      code: "app_ai_unavailable",
      reasonCode: "app_ai_unavailable",
      message,
      attribution: "platform",
      debugId,
    });
    this.name = "AppAIPlatformUnavailableError";
  }
}

function pickDetail(body: unknown): ErrorShape | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (record.detail && typeof record.detail === "object") {
    return record.detail as ErrorShape;
  }
  if (record.error && typeof record.error === "object") {
    return record.error as ErrorShape;
  }
  return record as ErrorShape;
}

export function parseAppAIErrorDetail(
  body: unknown,
  status: number,
): AppAIRequestError | null {
  const src = pickDetail(body);
  if (!src) {
    return status === 402 ? new AppAIPlatformUnavailableError() : null;
  }

  const attribution =
    src.attribution === "client" || src.attribution === "platform"
      ? src.attribution
      : undefined;
  const code = String(src.code || "");
  const reasonCode = String(src.reason_code || src.code || "");
  const message = String(src.message || APP_AI_UNAVAILABLE_MESSAGE);
  const debugId = src.debug_id ? String(src.debug_id) : undefined;

  if (attribution === "client") {
    return new AppAIRequestError({
      code: code || reasonCode,
      reasonCode: reasonCode || code,
      message,
      attribution: "client",
      debugId,
    });
  }

  if (
    attribution === "platform" ||
    code === "app_ai_unavailable" ||
    reasonCode === "app_ai_unavailable"
  ) {
    return new AppAIPlatformUnavailableError(message, debugId);
  }

  if (reasonCode === "credits_exhausted" || code === "credits_exhausted") {
    return new AppAIRequestError({
      code: "credits_exhausted",
      reasonCode: "credits_exhausted",
      message,
      attribution: "client",
      debugId,
    });
  }

  if (status === 402) {
    return new AppAIPlatformUnavailableError(message, debugId);
  }

  if (code || reasonCode) {
    return new AppAIRequestError({
      code: code || reasonCode,
      reasonCode: reasonCode || code,
      message,
      attribution: "client",
      debugId,
    });
  }

  return null;
}
