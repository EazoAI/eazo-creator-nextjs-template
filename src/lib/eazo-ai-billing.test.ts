import { expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

const { createAppAiClient, parseAppAIModelMap, resolveAppAIModelKey } =
  await import("./eazo-ai-billing");

test("parses the normal App AI model map", () => {
  expect(parseAppAIModelMap('{"text":"minimax.minimax-m3"}')).toEqual({
    text: "minimax.minimax-m3",
  });
});

test("recovers a model map whose dotenv quotes were escaped once", () => {
  expect(parseAppAIModelMap('{\\"text\\":\\"minimax.minimax-m3\\"}')).toEqual({
    text: "minimax.minimax-m3",
  });
});

test("recovers a model map serialized as a JSON string", () => {
  const encoded = JSON.stringify('{"text":"minimax.minimax-m3"}');
  expect(parseAppAIModelMap(encoded)).toEqual({ text: "minimax.minimax-m3" });
});

test("rejects malformed and non-object model maps", () => {
  expect(() => parseAppAIModelMap("not-json")).toThrow();
  expect(() => parseAppAIModelMap("[]")).toThrow();
  expect(() => parseAppAIModelMap('"still-a-string"')).toThrow();
});

test("prefers fixed capability variables without parsing legacy JSON", () => {
  const environment = {
    EAZO_AI_TEXT_MODEL_KEY: "new-text-model",
    EAZO_AI_VISION_MODEL_KEY: "new-vision-model",
    EAZO_AI_VIDEO_GENERATION_MODEL_KEY: "new-video-model",
    EAZO_AI_MODELS_JSON: "invalid legacy JSON is ignored",
  };
  expect(resolveAppAIModelKey("text", undefined, environment)).toBe("new-text-model");
  expect(resolveAppAIModelKey("vision", undefined, environment)).toBe("new-vision-model");
  expect(resolveAppAIModelKey("video_generation", undefined, environment)).toBe("new-video-model");
});

test("video generation uses the Creator App AI proxy", async () => {
  const previous = {
    base: process.env.EAZO_APP_AI_API_BASE,
    appId: process.env.EAZO_APP_ID,
    privateKey: process.env.EAZO_PRIVATE_KEY,
    providerMode: process.env.EAZO_AI_PROVIDER_MODE,
    videoModel: process.env.EAZO_AI_VIDEO_GENERATION_MODEL_KEY,
    fetch: globalThis.fetch,
  };
  process.env.EAZO_APP_AI_API_BASE = "https://creator.example";
  process.env.EAZO_APP_ID = "app-1";
  process.env.EAZO_PRIVATE_KEY = "private-key";
  process.env.EAZO_AI_PROVIDER_MODE = "eazo";
  process.env.EAZO_AI_VIDEO_GENERATION_MODEL_KEY = "veo-3.1-lite";
  const fetchMock = mock(async (input: string | URL | Request, init?: RequestInit) => {
    expect(String(input)).toBe("https://creator.example/api/app-ai/videos/generations");
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({
      app_id: "app-1",
      model_key: "veo-3.1-lite",
      prompt: "A paper plane crosses the sky",
      duration_seconds: 4,
      resolution: "720p",
      aspect_ratio: "16:9",
      generate_audio: false,
    });
    return Response.json({
      data: [{ b64_json: "dmlkZW8=", mime_type: "video/mp4" }],
    });
  });
  globalThis.fetch = fetchMock as typeof fetch;
  try {
    const result = await createAppAiClient().generateVideo({
      prompt: "A paper plane crosses the sky",
      generateAudio: false,
    });
    expect(result.data?.[0]?.mime_type).toBe("video/mp4");
  } finally {
    globalThis.fetch = previous.fetch;
    const restore = (key: string, value: string | undefined) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    };
    restore("EAZO_APP_AI_API_BASE", previous.base);
    restore("EAZO_APP_ID", previous.appId);
    restore("EAZO_PRIVATE_KEY", previous.privateKey);
    restore("EAZO_AI_PROVIDER_MODE", previous.providerMode);
    restore("EAZO_AI_VIDEO_GENERATION_MODEL_KEY", previous.videoModel);
  }
});

test("falls back to the legacy JSON map and text key", () => {
  expect(resolveAppAIModelKey("vision", undefined, {
    EAZO_AI_MODELS_JSON: '{"vision":"legacy-vision-model"}',
  })).toBe("legacy-vision-model");
  expect(resolveAppAIModelKey("text", undefined, {
    EAZO_AI_MODEL_KEY: "legacy-text-model",
  })).toBe("legacy-text-model");
});
