import { expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

const { parseAppAIModelMap } = await import("./eazo-ai-billing");

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
