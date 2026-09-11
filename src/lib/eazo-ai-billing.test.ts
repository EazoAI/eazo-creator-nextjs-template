import { expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

const { parseAppAIModelMap, resolveAppAIModelKey } = await import("./eazo-ai-billing");

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
    EAZO_AI_MODELS_JSON: "invalid legacy JSON is ignored",
  };
  expect(resolveAppAIModelKey("text", undefined, environment)).toBe("new-text-model");
  expect(resolveAppAIModelKey("vision", undefined, environment)).toBe("new-vision-model");
});

test("falls back to the legacy JSON map and text key", () => {
  expect(resolveAppAIModelKey("vision", undefined, {
    EAZO_AI_MODELS_JSON: '{"vision":"legacy-vision-model"}',
  })).toBe("legacy-vision-model");
  expect(resolveAppAIModelKey("text", undefined, {
    EAZO_AI_MODEL_KEY: "legacy-text-model",
  })).toBe("legacy-text-model");
});
