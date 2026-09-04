import "server-only";

export type AppAICapability = "text" | "vision" | "image_generation" | "speech_to_text" | "text_to_speech";

type ChatMessage = {
  role: string;
  content: unknown;
  [key: string]: unknown;
};

type ChatParams = {
	capability?: "text" | "vision";
  model?: string;
  model_key?: string;
  messages: ChatMessage[];
  stream?: boolean;
  [key: string]: unknown;
};

type StreamingChatParams = ChatParams & {
  stream: true;
};

type ChatCompletionLike = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type ChatDeltaChunk = {
  choices: Array<{
    delta?: {
      content?: string;
    };
  }>;
};

type ErrorBody = {
  code?: string;
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
  detail?: {
    code?: string;
    message?: string;
  };
};

export class AppAIUnavailableError extends Error {
  code = "app_ai_unavailable";

  constructor(message = "AI 功能暂时不可用。如需继续使用，请联系该应用的创作者。") {
    super(message);
    this.name = "AppAIUnavailableError";
  }
}

const APP_AI_UNAVAILABLE_MESSAGE =
  "AI 功能暂时不可用。如需继续使用，请联系该应用的创作者。";

function appAiApiBase() {
  return (
    process.env.EAZO_APP_AI_API_BASE ||
    process.env.EAZO_PLATFORM_API_BASE ||
    "https://eazo.ai/creator"
  ).replace(/\/+$/, "");
}

function providerBase() {
  return (process.env.AI_PROVIDER_BASE_URL || "").replace(/\/+$/, "");
}

function providerMode() {
  return (process.env.EAZO_AI_PROVIDER_MODE || "eazo").trim().toLowerCase();
}

function modelKey(params: ChatParams) {
  return configuredModelKey(params.capability || "text", params.model_key || params.model);
}

function configuredModelKey(capability: AppAICapability, explicit?: unknown) {
  let models: Record<string, unknown> = {};
  try {
    models = process.env.EAZO_AI_MODELS_JSON
      ? (JSON.parse(process.env.EAZO_AI_MODELS_JSON) as Record<string, unknown>)
      : {};
  } catch {
    throw new AppAIUnavailableError("App AI model configuration is invalid.");
  }
  const selected = models[capability] || explicit || (capability === "text" ? process.env.EAZO_AI_MODEL_KEY : undefined);
  if (!selected) throw new AppAIUnavailableError();
  return String(selected);
}

function requestId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function* streamProviderSse(response: Response): AsyncGenerator<ChatDeltaChunk> {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      let chunk: ChatDeltaChunk & ErrorBody;
      try {
        chunk = JSON.parse(data) as ChatDeltaChunk & ErrorBody;
      } catch {
        throw new Error("AI stream returned an invalid SSE payload");
      }
      if (chunk.error) {
        if (
          chunk.error.code === "app_ai_unavailable" ||
          chunk.error.code === "credits_exhausted"
        ) {
          throw new AppAIUnavailableError(chunk.error.message);
        }
        throw new Error(chunk.error.message || "AI stream failed");
      }
      yield chunk;
    }
  }
}

async function callCreatorProxy(
  params: StreamingChatParams,
): Promise<AsyncIterable<ChatDeltaChunk>>;
async function callCreatorProxy(params: ChatParams): Promise<ChatCompletionLike>;
async function callCreatorProxy(
  params: ChatParams,
): Promise<ChatCompletionLike | AsyncIterable<ChatDeltaChunk>> {
  const appId = process.env.EAZO_APP_ID;
  if (!appId) throw new AppAIUnavailableError();

  const { messages, ...rest } = params;
  delete rest.stream;
  delete rest.model;
  delete rest.model_key;
  delete rest.capability;
  const res = await fetch(`${appAiApiBase()}/api/app-ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-eazo-app-id": appId,
      ...(process.env.EAZO_PRIVATE_KEY
        ? { Authorization: `Bearer ${process.env.EAZO_PRIVATE_KEY}` }
        : {}),
    },
    body: JSON.stringify({
      app_id: appId,
      model_key: modelKey(params),
      messages,
      request_id: requestId(),
      stream: params.stream === true,
      params: rest,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const rawBody = await res.text().catch(() => "");
    let body: ErrorBody | string = rawBody;
    try {
      body = JSON.parse(rawBody) as ErrorBody;
    } catch {
      // Keep the plain response body for diagnostics.
    }
    const code =
      typeof body === "string"
        ? ""
        : body.detail?.code || body.error?.code || body.code;
    if (code === "app_ai_unavailable" || code === "credits_exhausted" || res.status === 402) {
      throw new AppAIUnavailableError(
        typeof body === "string"
          ? undefined
          : body.detail?.message || body.error?.message || body.message,
      );
    }
    throw new Error(typeof body === "string" ? body : `App AI request failed (${res.status})`);
  }
  return params.stream
    ? streamProviderSse(res)
    : ((await res.json()) as ChatCompletionLike);
}

async function callByokProvider(
  params: StreamingChatParams,
): Promise<AsyncIterable<ChatDeltaChunk>>;
async function callByokProvider(params: ChatParams): Promise<ChatCompletionLike>;
async function callByokProvider(
  params: ChatParams,
): Promise<ChatCompletionLike | AsyncIterable<ChatDeltaChunk>> {
  const base = providerBase();
  const apiKey = process.env.AI_PROVIDER_API_KEY;
  const model = process.env.AI_PROVIDER_MODEL || params.model || params.model_key;
  if (!base || !apiKey || !model) {
    throw new Error("BYOK AI provider is not configured");
  }
  const { ...body } = params;
  delete body.model_key;
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ ...body, model }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`AI provider request failed (${res.status})`);
  }
  return params.stream ? streamProviderSse(res) : ((await res.json()) as ChatCompletionLike);
}

async function chat(params: StreamingChatParams): Promise<AsyncIterable<ChatDeltaChunk>>;
async function chat(params: ChatParams): Promise<ChatCompletionLike>;
async function chat(
  params: ChatParams,
): Promise<ChatCompletionLike | AsyncIterable<ChatDeltaChunk>> {
  if (providerMode() === "byok") {
    return params.stream === true
      ? callByokProvider(params as StreamingChatParams)
      : callByokProvider(params);
  }
  return params.stream === true
    ? callCreatorProxy(params as StreamingChatParams)
    : callCreatorProxy(params);
}

export type GenerateImageParams = {
  prompt: string;
  size?: string;
  image?: string[];
  viewerUserId?: string;
};

export type GenerateImageResult = {
  created?: number;
  image_url?: string;
  data?: Array<{ url?: string; b64_json?: string }>;
};

export type TranscribeParams = {
  audio: Blob;
  filename?: string;
  language?: string;
  prompt?: string;
  viewerUserId?: string;
};

export type TranscriptionResult = { text: string; model?: string };

export type SpeechParams = {
  input: string;
  voice?: string;
  responseFormat?: string;
  viewerUserId?: string;
};

export type SpeechResult = {
  created?: number;
  audio_url?: string;
  voice?: string;
  data?: Array<{ b64_json?: string; mime_type?: string }>;
};

function appIdentity() {
  const appId = process.env.EAZO_APP_ID;
  const privateKey = process.env.EAZO_PRIVATE_KEY;
  if (!appId || !privateKey) throw new AppAIUnavailableError();
  return { appId, privateKey };
}

async function checkedJSON<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.clone().json().catch(() => null)) as ErrorBody | null;
    const code = body?.detail?.code || body?.error?.code || body?.code;
    if (response.status === 402 || code === "app_ai_unavailable" || code === "credits_exhausted") {
      throw new AppAIUnavailableError(body?.detail?.message || body?.error?.message || body?.message);
    }
    throw new Error(`App AI request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

async function generateImage(params: GenerateImageParams): Promise<GenerateImageResult> {
  if (providerMode() === "byok") {
    const model = process.env.AI_PROVIDER_MODEL;
    if (!model) throw new Error("BYOK AI provider model is not configured");
    return checkedJSON(await providerJSON("/images/generations", { model, prompt: params.prompt, size: params.size, image: params.image }));
  }
  const model = configuredModelKey("image_generation");
  const { appId, privateKey } = appIdentity();
  return checkedJSON(await fetch(`${appAiApiBase()}/api/app-ai/images/generations`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-eazo-app-id": appId, Authorization: `Bearer ${privateKey}` },
    body: JSON.stringify({ app_id: appId, model_key: model, prompt: params.prompt, size: params.size, image: params.image || [], viewer_user_id: params.viewerUserId, request_id: requestId() }),
    cache: "no-store",
  }));
}

async function transcribe(params: TranscribeParams): Promise<TranscriptionResult> {
  const model = providerMode() === "byok"
    ? process.env.AI_PROVIDER_MODEL
    : configuredModelKey("speech_to_text");
  if (!model) throw new Error("BYOK AI provider model is not configured");
  const data = new FormData();
  data.set("model", model);
  data.set("file", params.audio, params.filename || "audio.webm");
  if (params.language) data.set("language", params.language);
  if (params.prompt) data.set("prompt", params.prompt);
  if (providerMode() === "byok") {
    return checkedJSON(await providerForm("/audio/transcriptions", data));
  }
  const { appId, privateKey } = appIdentity();
  data.set("app_id", appId);
  data.set("request_id", requestId());
  if (params.viewerUserId) data.set("viewer_user_id", params.viewerUserId);
  return checkedJSON(await fetch(`${appAiApiBase()}/api/app-ai/audio/transcriptions`, {
    method: "POST",
    headers: { "x-eazo-app-id": appId, Authorization: `Bearer ${privateKey}` },
    body: data,
    cache: "no-store",
  }));
}

async function speech(params: SpeechParams): Promise<SpeechResult> {
  const model = providerMode() === "byok"
    ? process.env.AI_PROVIDER_MODEL
    : configuredModelKey("text_to_speech");
  if (!model) throw new Error("BYOK AI provider model is not configured");
  const payload = { model, input: params.input, voice: params.voice, response_format: params.responseFormat };
  if (providerMode() === "byok") return checkedJSON(await providerJSON("/audio/speech", payload));
  const { appId, privateKey } = appIdentity();
  return checkedJSON(await fetch(`${appAiApiBase()}/api/app-ai/audio/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-eazo-app-id": appId, Authorization: `Bearer ${privateKey}` },
    body: JSON.stringify({ app_id: appId, model_key: model, input: params.input, voice: params.voice, response_format: params.responseFormat, viewer_user_id: params.viewerUserId, request_id: requestId() }),
    cache: "no-store",
  }));
}

async function providerJSON(path: string, body: Record<string, unknown>): Promise<Response> {
  const base = providerBase();
  const apiKey = process.env.AI_PROVIDER_API_KEY;
  if (!base || !apiKey) throw new Error("BYOK AI provider is not configured");
  return fetch(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify(body), cache: "no-store" });
}

async function providerForm(path: string, body: FormData): Promise<Response> {
  const base = providerBase();
  const apiKey = process.env.AI_PROVIDER_API_KEY;
  if (!base || !apiKey) throw new Error("BYOK AI provider is not configured");
  return fetch(`${base}${path}`, { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body, cache: "no-store" });
}

export function createAppAiClient() {
  return {
    chat,
    generateImage,
    transcribe,
    speech,
  };
}

export const appAi = createAppAiClient();
export { APP_AI_UNAVAILABLE_MESSAGE };
