# Agent Guide

This repository is a Bun-first, minimal Next.js starter for building apps that run on the Eazo platform — seamlessly in a browser and inside the Eazo Mobile WebView.

## 1. Stack

- Next.js 16 with App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Bun (package manager + local script runner)
- `@eazo/sdk` — capability-first SDK: `auth`, `device`, `ai`, `storage`, `memory`, React integration, server-side `requireAuth`; bundles GenAuth login + ECC/AES session decryption internally; `ai` routes through AWS Bedrock via the Eazo AI gateway; `memory` records user actions as persistent, semantically searchable memory for AI context retrieval
- shadcn/ui, lucide-react, framer-motion
- Drizzle ORM (PostgreSQL via `drizzle-orm` + `postgres.js`)

## 2. Use This Template

1. Copy this project to start a new app.
2. Rename the package in `package.json`.
3. Read the following files to understand how the template implements each platform capability before writing any product code:
   - **Auth** — `src/app/layout.tsx`, `src/lib/auth/index.ts`, `src/components/user-profile/user-badge.tsx`, `src/lib/api/request.ts`
   - **Database** — `src/lib/db/schema/`, `src/lib/db/queries/`, `src/lib/db/client.ts`
   - **Object Storage** — `src/app/api/todos/[id]/attachment/route.ts`
   - **AI** — `src/app/api/todos/analyze/route.ts`, `src/components/todo-list/ai-analysis-panel.tsx`
   - **Memory** — `src/components/todo-list/index.tsx` (fire-and-forget `memory.reportAction()` pattern after each mutation)
4. Run `bun run cleanup:demo` before any feature development to remove all template demo artifacts.
5. Update app metadata in `src/app/layout.tsx`.
6. Replace the default content in `src/app/page.tsx`.
7. Add product-specific routes, components, and data logic from there.

## 3. Commands

```bash
bun install
bun dev
bun run lint
bun run build
bun start
bun run cleanup:demo   # one-click remove demo artifacts and auto-fix stale todos exports in index files
```

If you are developing `@eazo/sdk` locally, build it first and sync into `node_modules`:

```bash
(cd ../eazo-sdk/sdk && npm install && npm run build)
bun run sdk:sync
```

### 3.1 Database (Drizzle)

```bash
bun run db:generate
bun run db:migrate
bun run db:push
bun run db:studio
```

## 4. Project Structure

```
src/
  app/
    api/
      user/profile/route.ts   — GET: returns the authenticated user; upserts user to DB (both Web and Mobile paths)
      todos/route.ts          — GET (list) + POST (create)
      todos/[id]/route.ts     — GET / PATCH / DELETE
      todos/analyze/route.ts  — POST: streams AI analysis of the user's todo list (SSE)
      mcp/route.ts            — GET / POST / DELETE: MCP Streamable HTTP server (exposes todo CRUD as MCP tools)
    layout.tsx                — root layout; mounts <EazoProvider> (SDK auto-renders login UI inside)
    page.tsx                  — demo page
  components/
    user-profile/
      user-badge.tsx          — reads user via useEazo(s => s.auth.user); Sign-in button calls auth.login()
      user-sync-effect.tsx    — fires GET /api/user/profile after Mobile bridge login to upsert the user to DB
    todo-list/                — Todo List demo
      ai-analysis-panel.tsx   — streams and renders the AI analysis response
    ui/                       — shadcn/ui primitives
  lib/
    api/
      request.ts              — fetch wrapper; injects x-eazo-session via auth.getSessionHeader()
      user-profile.ts         — fetchUserProfile() → GET /api/user/profile
      todos.ts                — getTodos / createTodo / updateTodo / deleteTodo
    auth/
      index.ts                — re-exports requireAuth from @eazo/sdk/server
    db/
      schema/                 — Drizzle table definitions (todos, users)
      queries/                — db client + CRUD helpers (todos, users)
      migrations/             — auto-generated SQL files (commit to git)
  utils/
    utils.ts                  — cn() Tailwind class helper
```

## 5. Capabilities

The platform exposes capabilities through `@eazo/sdk`. Most capabilities (`auth`, `device`) work the same in browsers and inside Eazo Mobile. The `ai` capability is **server-side only** — see its section for details.


### 5.1 React Provider

Mount `EazoProvider` once at the root layout. Also mount `UserSyncEffect` inside the provider — it is a zero-render component that upserts the authenticated user to the local DB after every login (both Web and Mobile paths converge through `GET /api/user/profile`):

```tsx
// src/app/layout.tsx
import { EazoProvider } from "@eazo/sdk/react";
import { Toaster } from "@/components/ui/sonner";
import { UserSyncEffect } from "@/components/user-profile/user-sync-effect";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <EazoProvider>
          <UserSyncEffect />
          {children}
          <Toaster />
        </EazoProvider>
      </body>
    </html>
  );
}
```

Read reactive state with `useEazo(selector)` inside components. Call singletons directly outside render:

```tsx
import { auth } from "@eazo/sdk";
import { useEazo } from "@eazo/sdk/react";

// Inside render — reactive
const user = useEazo((s) => s.auth.user);

// Outside render (event handler / effect) — direct call
<button onClick={() => auth.loginWithSocial("google")}>Sign in</button>
```

**Rule**: inside render, read reactive state via `useEazo(selector)`. Outside render (event handlers, effects, non-React code), use `auth.xxx` / `device.xxx` directly.


### 5.2 `auth`

```ts
import { auth } from "@eazo/sdk";

auth.user                                    // User | null (reactive)
auth.loading                                 // boolean
auth.authenticated                           // boolean
await auth.getToken()                        // string | null
auth.onChange((user) => { /* ... */ })       // subscribe — returns unsubscribe

await auth.loginWithSocial("google")
await auth.loginWithEmailPassword(email, password)
await auth.loginWithEmailCode(email, code)
await auth.sendEmailCode(email)
await auth.logout()
```

#### 5.2.1 Login UI

`@eazo/sdk` owns the login experience. Web runs the SDK-bundled login UI; Eazo Mobile routes to the native host login flow. App code never builds its own login UI.

Trigger login from anywhere:

```ts
import { auth } from "@eazo/sdk";

await auth.login();              // opens UI if needed, resolves with current User
await auth.login({ timeoutMs }); // optional timeout override (default 5 min)
auth.showLogin();                // imperative open
auth.hideLogin();                // imperative close (rejects any pending login())
```

`auth.login()` is idempotent — if the user is already authenticated it resolves immediately.

**Gating a page behind auth — correct pattern:**

```tsx
"use client";
import { auth } from "@eazo/sdk";
import { useEazo } from "@eazo/sdk/react";
import { Button } from "@/components/ui/button";

export function MyFeaturePage() {
  const user = useEazo((s) => s.auth.user);
  const loading = useEazo((s) => s.auth.loading);

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground">请先登录后继续</p>
        <Button onClick={() => auth.login().catch(() => undefined)}>登录</Button>
      </div>
    );
  }

  return <MyFeatureContent user={user} />;
}
```

**Never do this:**

```tsx
// ❌ Shows text but user has no way to actually log in
if (!user) return <p>需要登录</p>;

// ❌ Building a custom login form from scratch
if (!user) return <CustomLoginForm />;
```

Low-level login primitives (`auth.loginWithSocial` / `loginWithEmailPassword` / `loginWithEmailCode`) are still exposed — use them only when you need to bypass the bundled UI.

#### 5.2.2 Server-side auth guard

```ts
import { requireAuth } from "@/lib/auth"; // re-exports @eazo/sdk/server

export function GET(request: NextRequest) {
  const r = requireAuth(request);
  if (!r.ok) return r.response;
  // r.user: { id, email, name, avatarUrl }
}
```

#### 5.2.3 Login paths and user persistence

The SDK handles two login paths transparently:

| Path | How it works | DB upsert trigger |
|---|---|---|
| **Web** (browser) | User clicks Sign in → SDK shows login UI → `loginWith*` → SDK calls `GET /api/user/profile` to hydrate the user | `GET /api/user/profile` upserts on every call |
| **Mobile** (Eazo WebView) | Bridge handshake → host injects user via `hello` message → SDK sets auth state directly | `UserSyncEffect` detects `authenticated + platform === "mobile"`, then calls `GET /api/user/profile` |

Both paths converge at `GET /api/user/profile`, which calls `upsertUser()` in the background (non-blocking). This keeps the `users` table up to date without any extra round-trips.

#### 5.2.4 Authenticated API calls (client)

```ts
import { request } from "@/lib/api/request";
const res = await request("/api/my-endpoint");  // x-eazo-session auto-injected
```

### 5.3 `device`

```ts
import { device } from "@eazo/sdk";

device.platform      // 'web' | 'mobile'
device.locale        // 'zh-CN' | ...
device.safeArea      // { top, bottom }
device.backendUrl    // platform backend URL
```

### 5.4 `ai` — Server-side AI (AWS Bedrock via bedrock-mantle)

> **`ai` is strictly server-side. Never import or call it in any client component (`"use client"` files), browser code, or `src/lib/api/` helpers. All AI logic must live exclusively in `src/app/api/` route handlers.**

The `ai` capability routes calls through the Eazo platform's AI gateway (AWS Bedrock). It is built on the `openai` package — all parameter and response types are identical to the OpenAI SDK.

**Setup** — configure the private key once at the top of the route file:

```ts
import { ai } from "@eazo/sdk";

ai.configure({ privateKey: process.env.EAZO_PRIVATE_KEY! });
// Or omit this call if EAZO_PRIVATE_KEY is already set as an env var.
```

**Non-streaming** — returns a `ChatCompletion` object:

```ts
const result = await ai.chat({
  model: "deepseek.v3.1",
  messages: [{ role: "user", content: "Hello!" }],
});
console.log(result.choices[0].message.content);
```

**Streaming** — pass `stream: true` and iterate over `ChatCompletionChunk`s:

```ts
const stream = await ai.chat({
  model: "deepseek.v3.1",
  messages: [{ role: "user", content: "Tell me a story." }],
  stream: true,
  max_tokens: 512,
});
for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
}
```

**Function calling** — tools are fully supported:

```ts
const result = await ai.chat({
  model: "deepseek.v3.1",
  messages: [{ role: "user", content: "What is the weather in Shanghai?" }],
  tools: [{ type: "function", function: { name: "get_weather", description: "...", parameters: {} } }],
  tool_choice: "auto",
});
```

**Streaming SSE from a Next.js API route** — the recommended pattern for surfacing AI output to the client:

```ts
// src/app/api/my-feature/analyze/route.ts
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { ai } from "@eazo/sdk";

ai.configure({ privateKey: process.env.EAZO_PRIVATE_KEY! });

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  const stream = await ai.chat({
    model: "deepseek.v3.1",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "..." },
    ],
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (delta) controller.enqueue(encoder.encode(delta));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
```

**Consuming a streaming response on the client** — read the `ReadableStream` body incrementally and append each chunk to state:

```tsx
"use client";
import { auth } from "@eazo/sdk";

async function runStream(signal: AbortSignal, onChunk: (delta: string) => void) {
  const sessionHeader = await auth.getSessionHeader();
  const res = await fetch("/api/my-feature/analyze", {
    method: "POST",
    headers: sessionHeader ? { "x-eazo-session": sessionHeader } : {},
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}
```

**Important constraints:**

- **`ai` is server-side only — this is a hard rule.** Never import `ai` from `@eazo/sdk` in any file that contains `"use client"`, any hook, any component, or any `src/lib/api/` helper. Doing so would expose `EAZO_PRIVATE_KEY` to the browser.
- The correct architecture is always: **client component → `fetch` to an API route → API route calls `ai.chat()`**. The AI response is then streamed or returned back to the client over HTTP.
- Always guard the route with `requireAuth` before invoking `ai.chat()`.
- Use `deepseek.v3.1` as the default model unless there is a specific reason to change it. Full list of supported models:

  | Model | Vision |
  |---|---|
  | `deepseek.v3.1` | ❌ |
  | `deepseek.v3.2` | ❌ |
  | `openai.gpt-oss-20b` | ❌ |
  | `openai.gpt-oss-120b` | ❌ |
  | `openai.gpt-oss-safeguard-20b` | ❌ |
  | `openai.gpt-oss-safeguard-120b` | ❌ |
  | `qwen.qwen3-32b` | ❌ |
  | `qwen.qwen3-235b-a22b-2507` | ❌ |
  | `qwen.qwen3-coder-30b-a3b-instruct` | ❌ |
  | `qwen.qwen3-coder-480b-a35b-instruct` | ❌ |
  | `qwen.qwen3-coder-next` | ❌ |
  | `qwen.qwen3-next-80b-a3b-instruct` | ❌ |
  | `qwen.qwen3-vl-235b-a22b-instruct` | ✅ |
  | `mistral.ministral-3-3b-instruct` | ✅ |
  | `mistral.ministral-3-8b-instruct` | ✅ |
  | `mistral.ministral-3-14b-instruct` | ✅ |
  | `mistral.magistral-small-2509` | ✅ |
  | `mistral.mistral-large-3-675b-instruct` | ✅ |
  | `mistral.devstral-2-123b` | ❌ |
  | `mistral.voxtral-mini-3b-2507` | ❌ |
  | `mistral.voxtral-small-24b-2507` | ❌ |
  | `google.gemma-3-4b-it` | ✅ |
  | `google.gemma-3-12b-it` | ✅ |
  | `google.gemma-3-27b-it` | ✅ |
  | `nvidia.nemotron-nano-9b-v2` | ❌ |
  | `nvidia.nemotron-nano-12b-v2` | ✅ |
  | `nvidia.nemotron-nano-3-30b` | ❌ |
  | `nvidia.nemotron-super-3-120b` | ❌ |
  | `minimax.minimax-m2` | ❌ |
  | `minimax.minimax-m2.1` | ❌ |
  | `minimax.minimax-m2.5` | ❌ |
  | `moonshotai.kimi-k2-thinking` | ❌ |
  | `moonshotai.kimi-k2.5` | ✅ |
  | `zai.glm-4.6` | ❌ |
  | `zai.glm-4.7` | ❌ |
  | `zai.glm-4.7-flash` | ❌ |
  | `zai.glm-5` | ❌ |
  | `writer.palmyra-vision-7b` | ✅ |
- Re-exporting AI types: `ChatCompletion`, `ChatCompletionChunk`, `ChatCompletionCreateParamsNonStreaming`, `ChatCompletionCreateParamsStreaming` are all available from `@eazo/sdk` — no need to install `openai` separately.

Never do this:

```tsx
// ❌ src/components/my-feature/index.tsx — client component calling ai directly
"use client";
import { ai } from "@eazo/sdk"; // WRONG — exposes private key to the browser

export function MyFeature() {
  const handleClick = async () => {
    const result = await ai.chat({ model: "deepseek.v3.1", messages: [...] });
  };
}
```

Always do this instead:

```
Client component  →  fetch("/api/my-feature/...")  →  API route handler  →  ai.chat()
```

## 6. Memory — User Memory Persistence

`memory.reportAction()` writes a user action event to the Gum memory service — a persistent, semantically searchable log of what users did in your app. Gum stores events server-side and makes them available for AI context retrieval in later sessions.

**Client-side only.** Call it from `"use client"` components or client-side helpers. It uses the same `NEXT_PUBLIC_EAZO_APP_ID` and session as `auth` — no extra configuration required.

```ts
import { memory } from "@eazo/sdk";
import type { MemoryActionParams } from "@eazo/sdk";

// Fire-and-forget — always catch so Gum failures never block the user
memory.reportAction({
  content: 'User created todo: "Buy groceries"',   // required — readable description
  event_type: "create",                             // action category
  page: "todo_list",                               // page identifier
  metadata: {
    type: "create_todo",
    todo: { id: "123", title: "Buy groceries" },
  },
}).catch(() => {});
```

**Parameters:**

| Field | Type | Description |
|---|---|---|
| `content` | `string` (required) | Readable, full-sentence description of the event. Good: `"User clicked the publish button on the editor page"`. Bad: `"click"`. |
| `event_type` | `string` | Action category, e.g. `"create"`, `"update"`, `"delete"`, `"click"`, `"search"`. |
| `page` | `string` | Page or screen identifier, e.g. `"todo_list"`, `"editor"`, `"settings"`. |
| `metadata` | `Record<string, unknown>` | Structured event data. Must include `appid` (auto-injected from `NEXT_PUBLIC_EAZO_APP_ID` when omitted). Include a `type` field matching `event_type` and the relevant business objects. |
| `session_id` | `string` | Associate the event with a Gum session for conversational memory. |
| `device_id` | `string` | Device identifier. |
| `app` | `string` | App name / identifier. |
| `platform` | `string` | `"web"`, `"ios"`, `"android"`, etc. |
| `timestamp` | `string` | ISO 8601. Defaults to current time. |

**Recommended metadata shape:**

Model `metadata` after the event type so Gum can understand what happened:

```ts
// create / update / delete a record
metadata: {
  type: "create_todo",
  todo: { id: 123, title: "Buy groceries", done: false },
}

// toggle / status change
metadata: {
  type: "complete_todo",
  todo_id: 123,
}

// search
metadata: {
  type: "search_app",
  search_query: "recipe app",
}
```

`metadata.appid` is automatically injected by the SDK from `NEXT_PUBLIC_EAZO_APP_ID`. Do not set it manually.

**The fire-and-forget pattern:**

Always chain `.catch(() => {})`. Gum is auxiliary — its failure must never break core user flows:

```ts
async function handleDelete(id: number) {
  try {
    await deleteTodo(id);                   // primary operation
    memory.reportAction({                   // fire-and-forget
      content: "User deleted a todo",
      event_type: "delete",
      page: "todo_list",
      metadata: { type: "delete_todo", todo_id: id },
    }).catch(() => {});
    setTodos((prev) => prev.filter((t) => t.id !== id));
  } catch {
    toast.error("Failed to delete todo");
  }
}
```

**When to call it:**

- After every meaningful mutation (create, update, delete, upload, attach)
- After user navigation to an important screen
- After completing a significant workflow step

**When NOT to call it:**

- On every keystroke or scroll event
- For read-only operations like list fetches (low-signal noise)
- Inside server-side route handlers (`src/app/api/`) — it is a browser-only API

See `src/components/todo-list/index.tsx` for a complete example of six todo mutations each reporting to Gum.

## 7. MCP Server

The template ships a built-in **MCP (Model Context Protocol) server** at `/api/mcp`. After running `bun run cleanup:demo`, all demo tools are removed and `src/lib/mcp/server.ts` is kept as a clean entry point ready for your own tools.

### Transport

Streamable HTTP (Web Standard), via `@modelcontextprotocol/sdk`'s `WebStandardStreamableHTTPServerTransport` (imported from `webStandardStreamableHttp.js`). Runs stateless — every request creates a fresh server instance, compatible with serverless deployments (Vercel, etc.).

**Do NOT replace this with `StreamableHTTPServerTransport` from `streamableHttp.js`.** That is a Node.js HTTP transport: it does not accept a `NextRequest`, requires manual body parsing (`request.text()`), and does not work on Vercel. The Web Standard variant is the only correct choice for Next.js.

### Authentication

The MCP endpoint uses the same `requireAuth(request)` guard as every other API route. It reads the `x-eazo-session` header and scopes all tool calls to the authenticated user's data. The `userId` is passed into every tool via closure — never trust user-supplied IDs.

### Connecting a Client

**Cursor / Claude Desktop (`mcp.json` / `claude_desktop_config.json`)**

```json
{
  "mcpServers": {
    "my-app": {
      "url": "https://your-app.vercel.app/api/mcp",
      "headers": {
        "x-eazo-session": "<your-eazo-session-token>"
      }
    }
  }
}
```

For local development replace the URL with `http://localhost:3000/api/mcp`.

### How to Add a New Tool

**Step 1 — Create `src/lib/mcp/tools/<tool-name>.ts`**

Each tool lives in its own file and exports one `register*` function that receives the `McpServer` instance and the authenticated `userId`:

```ts
// src/lib/mcp/tools/get-project.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getProjectById } from "@/lib/db/queries";

export function registerGetProject(server: McpServer, userId: string) {
  server.registerTool(
    "get_project",
    {
      description: "Get a project by ID.",
      inputSchema: {
        id: z.number().int().positive().describe("The project ID"),
      },
    },
    async ({ id }) => {
      const project = await getProjectById(id, userId);
      if (!project) {
        return {
          isError: true,
          content: [{ type: "text", text: `Project ${id} not found.` }],
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(project, null, 2) }],
      };
    }
  );
}
```

Rules for tool files:
- File: `src/lib/mcp/tools/<kebab-case>.ts`
- Export: one `register<ToolName>` function, nothing else
- Always use `userId` from the function argument — never from input args
- Return `{ isError: true, content: [...] }` for not-found / validation errors
- Return `{ content: [{ type: "text", text: JSON.stringify(result, null, 2) }] }` for success

**Step 2 — Register it in `src/lib/mcp/server.ts`**

```ts
// src/lib/mcp/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGetProject } from "./tools/get-project";

export function buildMcpServer(userId: string): McpServer {
  const server = new McpServer({ name: "eazo-mcp", version: "1.0.0" });

  registerGetProject(server, userId);
  // add more tools here...

  return server;
}
```

That's all — **do not modify `src/app/api/mcp/route.ts`**. It is transport-only glue and must not be rewritten. If it ever looks wrong, restore it to exactly this:

```ts
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { buildMcpServer } from "@/lib/mcp/server";

async function handleMcpRequest(request: NextRequest): Promise<Response> {
  const auth = requireAuth(request);
  if (!auth.ok) return auth.response;

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  const server = buildMcpServer(auth.user.id);
  await server.connect(transport);

  return transport.handleRequest(request);
}

export async function GET(request: NextRequest) {
  return handleMcpRequest(request);
}

export async function POST(request: NextRequest) {
  return handleMcpRequest(request);
}

export async function DELETE(request: NextRequest) {
  return handleMcpRequest(request);
}
```

### File Layout

```
src/lib/mcp/
  server.ts              — assembles McpServer and registers all tools
  tools/
    <tool-name>.ts       — one register* function per file
src/app/api/mcp/
  route.ts               — HTTP glue only (auth + transport + handler)
```

## 8. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `EAZO_PRIVATE_KEY` | Yes (server) | Hex-encoded 64-char private key; used by `requireAuth` to decrypt sessions |
| `NEXT_PUBLIC_EAZO_APP_ID` | Yes (browser) | Eazo app ID; used when exchanging a GenAuth JWT for a session token |
| `NEXT_PUBLIC_EAZO_API_URL` | Optional | Eazo platform backend URL exposed via `device.backendUrl` (web fallback) |
| `DATABASE_URL` | If using DB | `postgresql://USER:PASS@HOST:PORT/DATABASE` |
| `NEXT_PUBLIC_GENAUTH_APP_ID` | Optional | Override GenAuth App ID default |
| `NEXT_PUBLIC_GENAUTH_APP_DOMAIN` | Optional | Override GenAuth tenant domain default |

Copy `.env.example` to `.env` to configure locally.

## 9. UI Components

shadcn/ui is initialized. Available from `@/components/ui/`:

| Component | Import |
|---|---|
| Button | `import { Button } from "@/components/ui/button"` |
| Card | `import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"` |
| Dialog | `import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"` |
| Input | `import { Input } from "@/components/ui/input"` |
| Label | `import { Label } from "@/components/ui/label"` |
| Select | `import { Select, SelectContent, SelectItem } from "@/components/ui/select"` |
| Sheet | `import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet"` |
| Tabs | `import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"` |
| Textarea | `import { Textarea } from "@/components/ui/textarea"` |
| Sonner (toast) | `import { Toaster } from "@/components/ui/sonner"` |

Add more: `bunx shadcn@latest add <component>`. Icons: `lucide-react`. Animation: `framer-motion`.

## 10. Adding New Pages

Each URL maps to a `page.tsx` under `src/app/`. Extract non-trivial UI into `src/components/<feature>/` and keep `page.tsx` as a thin entry point.

1. **Route file** (`src/app/dashboard/page.tsx`):
   ```tsx
   import { DashboardPage } from "@/components/dashboard";
   export default function Dashboard() {
     return <DashboardPage />;
   }
   ```
2. **Page component** (`src/components/dashboard/index.tsx`):
   ```tsx
   "use client";
   import { useEazo } from "@eazo/sdk/react";

   export function DashboardPage() {
     const user = useEazo((s) => s.auth.user);
     // ...
   }
   ```
3. **If the page needs a new API route** — add `src/app/api/<resource>/route.ts` and guard it with `requireAuth`.

## 11. Coding Requirements

### 11.1 Component Encapsulation (mandatory)

- **Never write all code in one file.** A `page.tsx` must remain a thin entry point — it imports one top-level feature component and renders it. Business logic, UI sections, and sub-components all live in separate files.
- **One component per file — strictly enforced.** Each file must export exactly one component. No exceptions: even small helper components must have their own file. If you find yourself writing a second component in the same file, stop and split immediately.

Bad — multiple components in one file:

```tsx
// src/components/dashboard/index.tsx  ❌
export function StatsCard() { ... }
export function RecentActivity() { ... }
export function DashboardPage() {
  return (
    <>
      <StatsCard />
      <RecentActivity />
    </>
  );
}
```

Good — each component in its own file:

```tsx
// src/components/dashboard/stats-card.tsx  ✅
export function StatsCard() { ... }

// src/components/dashboard/recent-activity.tsx  ✅
export function RecentActivity() { ... }

// src/components/dashboard/index.tsx  ✅
import { StatsCard } from "./stats-card";
import { RecentActivity } from "./recent-activity";

export function DashboardPage() {
  return (
    <>
      <StatsCard />
      <RecentActivity />
    </>
  );
}
```
- **Extract every non-trivial section.** Any UI block that has its own state, its own data fetch, or spans more than ~50 lines should be its own component file.
- **Group by feature, not by type.** Place related components together under `src/components/<feature>/`. Do not dump everything into a flat `components/` folder.

Example of the correct split for a "Dashboard" feature:

```
src/components/dashboard/
  index.tsx          — DashboardPage (top-level, imported by page.tsx)
  dashboard-header.tsx
  stats-grid.tsx
  recent-activity.tsx
  activity-item.tsx
```

### 11.2 File Size Limits

| File type | Soft limit | Hard limit |
|---|---|---|
| Page component (`page.tsx`) | 30 lines | 50 lines |
| Feature component | 150 lines | 250 lines |
| Utility / helper | 80 lines | 150 lines |
| API route handler | 60 lines | 100 lines |

When a file approaches its hard limit, split it before continuing.

### 11.3 Naming Conventions

- Component files: `kebab-case.tsx` (e.g. `user-profile-card.tsx`)
- Component exports: `PascalCase` named export (e.g. `export function UserProfileCard`)
- Each feature folder exposes a barrel `index.tsx` that re-exports the top-level component.
- API helpers: `camelCase` functions in `src/lib/api/<resource>.ts`.

### 11.4 State and Data

- Do not fetch data directly inside a `page.tsx`. Delegate to a client component or a server component that lives in `src/components/`.
- Read auth state with `useAuthStore((s) => s.user)` — do not re-fetch profile inside individual components.
- Keep Zustand stores in `src/stores/`. Do not create ad-hoc `useState` sprawl across multiple files for shared state.

### 11.5 API Requests (mandatory)

- **All API call logic must live in `src/lib/api/`.** Never call `fetch` or `request()` directly inside a page or component file.
- Group by resource: `src/lib/api/todos.ts`, `src/lib/api/projects.ts`, etc. Each file exports typed async functions for that resource's CRUD operations.
- Re-export everything through `src/lib/api/index.ts` so consumers import from one place:

```ts
// correct
import { getTodos, createTodo } from "@/lib/api";

// wrong — fetch inside a component
const res = await request("/api/todos");
```

- API functions must be fully typed: explicit parameter types and return types (no implicit `any`).
- Error handling belongs in the API layer, not scattered across components.

### 11.6 Imports

- Use `@/` path aliases everywhere — no relative `../../` chains.
- Import UI primitives from `@/components/ui/`, not directly from shadcn source paths.

## 12. Project Rules

- Prefer Bun for all install and script commands.
- Keep the template lean and framework-native.
- Do not reach into `@eazo/sdk` internals. The public surface is `auth`, `device`, `ai`, `storage`, `memory`, `useEazo`, `EazoProvider`, `requireAuth`, and semantic types.
- **`ai` must only be called inside `src/app/api/` route handlers — never in client components, hooks, or `src/lib/api/` helpers.**
- **Call `memory.reportAction()` (fire-and-forget) after every meaningful user mutation.** Always chain `.catch(() => {})` — Gum failures must never break core user flows. Do not call it for read-only fetches or inside server-side route handlers.
- Keep demo code out of new product code.
- **Always maintain a local `users` table.** Every app must persist authenticated user info in its own database. The template's `users` schema and `upsertUser` query are the reference implementation — do not remove them. `GET /api/user/profile` upserts on every call (Web path); `UserSyncEffect` triggers the same upsert after a Mobile bridge login. If you add new user-facing features, join against the local `users` table rather than relying solely on the SDK session.
- Before starting feature development, run `bun run cleanup:demo` to remove all demo/example artifacts (TodoList pages/components, demo API routes, demo DB schema/migrations) and auto-clean stale `./todos` exports in index files.
- Before shipping, run `bun run lint` and `bun run build`.

## 13. Goal

Start fast, stay flexible, and only add complexity when there is a concrete product requirement.
