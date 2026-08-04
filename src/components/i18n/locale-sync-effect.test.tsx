import { afterEach, beforeEach, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import i18n from "@/i18n";
import { LOCALE_STORAGE_KEY } from "@/lib/i18n/preference";
import { LocaleSyncEffect } from "./locale-sync-effect";

let browserWindow: Window;
let root: Root;

beforeEach(async () => {
  browserWindow = new Window({ url: "https://example.test" });

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: browserWindow,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: browserWindow.document,
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: browserWindow.navigator,
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: browserWindow.localStorage,
  });
  Object.defineProperty(globalThis.navigator, "language", {
    configurable: true,
    value: "en-US",
  });
  browserWindow.localStorage.setItem(LOCALE_STORAGE_KEY, "system");
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  await i18n.changeLanguage("en-US");
  root = createRoot(browserWindow.document.createElement("div"));
});

afterEach(async () => {
  await act(async () => root.unmount());
  await browserWindow.close();
  Reflect.deleteProperty(globalThis, "window");
  Reflect.deleteProperty(globalThis, "document");
  Reflect.deleteProperty(globalThis, "navigator");
  Reflect.deleteProperty(globalThis, "localStorage");
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

test("updates a system locale when the browser language changes", async () => {
  await act(async () => {
    root.render(<LocaleSyncEffect />);
  });

  Object.defineProperty(globalThis.navigator, "language", {
    configurable: true,
    value: "zh-CN",
  });

  await act(async () => {
    window.dispatchEvent(new browserWindow.Event("languagechange"));
    await Promise.resolve();
  });

  expect(i18n.resolvedLanguage).toBe("zh-CN");
});
