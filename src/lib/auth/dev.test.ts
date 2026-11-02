import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import { runInNewContext } from "node:vm";
import { Window } from "happy-dom";
import { NextRequest } from "next/server";

mock.module("server-only", () => ({}));
const upsertUser = mock(async (user: { id: string }) => user);
mock.module("@/lib/db/queries", () => ({ upsertUser }));

const { getDevAuthScript, getDevUser } = await import("./dev");
const { requireAuth } = await import("./index");
const { GET: profile } = await import("@/app/api/user/profile/route");

const savedEnv = { ...process.env };
const privateKey = "1".padStart(64, "0");
const session = (alias: unknown) => JSON.stringify({ __eazoDevUser: alias });
const request = (raw: string | null) => new NextRequest("http://localhost/api/user/profile", {
  headers: raw === null ? {} : { "x-eazo-session": raw },
});

beforeEach(() => {
  Object.assign(process.env, {
    NODE_ENV: "development",
    EAZO_DEV_MOCK_AUTH: "1",
    EAZO_PRIVATE_KEY: privateKey,
  });
  upsertUser.mockClear();
});

afterEach(() => {
  for (const key of ["NODE_ENV", "EAZO_DEV_MOCK_AUTH", "EAZO_PRIVATE_KEY"]) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

test("each alias has a stable identity and the profile API upserts separate users", async () => {
  for (const alias of ["alice", "bob", "alice"]) {
    const response = await profile(request(session(alias)));
    const { user } = await response.json();
    expect(response.status).toBe(200);
    expect(user).toEqual({
      id: `__eazo_dev__${alias}`, name: alias,
      email: `${alias}@preview.invalid`, avatarUrl: null,
    });
    expect(upsertUser.mock.calls.at(-1)?.[0].id).toBe(user.id);
  }
  expect(upsertUser.mock.calls.map(([user]) => user.id)).toEqual([
    "__eazo_dev__alice", "__eazo_dev__bob", "__eazo_dev__alice",
  ]);
});

test("malformed aliases and client-supplied identity or role overrides are rejected", () => {
  const invalid = [null, 123, "", "none", "Alice", "_alice", "a".repeat(33), "alice\n", "alice\r", "../alice"];
  for (const alias of invalid) expect(getDevUser(session(alias))).toBeNull();
  for (const raw of [null, "null", "[]", "broken", JSON.stringify({ __eazoDevUser: "alice", id: "real-user", role: "admin" })]) {
    expect(getDevUser(raw)).toBeNull();
    const auth = requireAuth(request(raw));
    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.response.status).toBe(401);
  }
});

test("mock auth requires both development mode and the explicit server flag", async () => {
  for (const [mode, flag] of [["production", "1"], ["test", "1"], ["development", "0"], ["development", ""]]) {
    Object.assign(process.env, { NODE_ENV: mode, EAZO_DEV_MOCK_AUTH: flag });
    expect(getDevAuthScript()).toBeNull();
    const response = await profile(request(session("alice")));
    expect(response.status).toBe(401);
  }
  expect(upsertUser).not.toHaveBeenCalled();
});

// Exercise the SDK verifier with a genuine session and a public test-only key.
const realSession = JSON.stringify({
  "encryptedKey": "AoXz/PCFQ6+v79h6kmrG7hzHK3Zoi8nAeoTaOaYIHc5OdrsYby7YiGdMYyct2LerM7KnI7UzKO6FQn7AMEQNwVx6turQ8owrA8HCG7NQjX+H280KnKaAeGQIc0nXfTqiqA==",
  "encryptedData": "99IL2IcikTZT71rDkwM9GX2HDXMA6QiFq30SD/WxP1usNw/9m7zyT7SC67r3",
  "iv": "p63QdcML4Jm+Kxri",
  "authTag": "bnG1OJ9ikJMlC/VBYZ6/vA=="
});

test("real sessions pass the SDK verifier with mock auth on, off and in production", () => {
  const raw = realSession;
  for (const [mode, flag] of [["development", "1"], ["development", "0"], ["production", "1"]]) {
    Object.assign(process.env, { NODE_ENV: mode, EAZO_DEV_MOCK_AUTH: flag });
    const auth = requireAuth(request(raw));
    expect(auth.ok).toBe(true);
    if (auth.ok) expect(auth.user.id).toBe("real-user");
  }
});

function runBootstrap(browser: Window, script: string) {
  runInNewContext(script, { window: browser, location: browser.location, localStorage: browser.localStorage, URLSearchParams });
}

test("bootstrap switches users, preserves existing sessions and supports anonymous visits", async () => {
  const browser = new Window({ url: "http://localhost/?__dev_user=alice" });
  const script = getDevAuthScript()!;
  const read = () => JSON.parse(browser.localStorage.getItem("eazo.session") ?? "null");
  try {
    runBootstrap(browser, script);
    expect(read()).toEqual({ __eazoDevUser: "alice" });
    browser.location.href = "http://localhost/?__dev_user=bob";
    runBootstrap(browser, script);
    expect(read()).toEqual({ __eazoDevUser: "bob" });
    browser.location.href = "http://localhost/";
    runBootstrap(browser, script);
    expect(read()).toEqual({ __eazoDevUser: "bob" });
    browser.localStorage.setItem("eazo.session", "real-session");
    runBootstrap(browser, script);
    expect(browser.localStorage.getItem("eazo.session")).toBe("real-session");
    browser.location.href = "http://localhost/?__dev_user=none";
    runBootstrap(browser, script);
    expect(read()).toBeNull();
    runBootstrap(browser, script);
    expect(read()).toBeNull();
    browser.location.href = "http://localhost/?__dev_user=alice%0A";
    runBootstrap(browser, script);
    expect(read()).toBeNull();
    browser.location.href = "http://localhost/";
    runBootstrap(browser, script);
    expect(read()).toEqual({ __eazoDevUser: "preview" });
  } finally {
    await browser.close();
  }
});

test("bootstrap leaves iframe and Mobile host identities untouched", async () => {
  for (const property of ["top", "ReactNativeWebView"]) {
    const browser = new Window({ url: "http://localhost/?__dev_user=alice" });
    try {
      browser.localStorage.setItem("eazo.session", "host-session");
      Object.defineProperty(browser, property, { configurable: true, value: {} });
      runBootstrap(browser, getDevAuthScript()!);
      expect(browser.localStorage.getItem("eazo.session")).toBe("host-session");
    } finally {
      await browser.close();
    }
  }
});

test("the actual browser SDK hydrates each mock identity through the existing profile API", async () => {
  const { auth } = await import("@eazo/sdk");
  const { __resetSDK } = await import("@eazo/sdk/testing");
  const originalFetch = globalThis.fetch;
  const globals = ["window", "document", "navigator", "localStorage"] as const;
  const descriptors = globals.map((key) => Object.getOwnPropertyDescriptor(globalThis, key));
  try {
    globalThis.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(input).toBe("/api/user/profile");
      return profile(request(new Headers(init?.headers).get("x-eazo-session")));
    }) as typeof fetch;
    for (const alias of ["alice", "bob"]) {
      const browser = new Window({ url: `http://localhost/?__dev_user=${alias}` });
      try {
        for (const key of globals) {
          Object.defineProperty(globalThis, key, { configurable: true, value: key === "window" ? browser : browser[key] });
        }
        __resetSDK();
        runBootstrap(browser, getDevAuthScript()!);
        let unsubscribe = () => {};
        const ready = new Promise<void>((resolve) => {
          unsubscribe = auth.onChange(() => resolve());
        });
        void auth.user;
        await ready;
        unsubscribe();
        expect(auth.authenticated).toBe(true);
        expect(auth.user?.id).toBe(`__eazo_dev__${alias}`);
        expect(await auth.getSessionHeader()).toBe(session(alias));
      } finally {
        __resetSDK();
        await browser.close();
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
    globals.forEach((key, index) => {
      const descriptor = descriptors[index];
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    });
  }
});
