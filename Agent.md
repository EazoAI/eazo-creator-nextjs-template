# Agent Guide

This repository is a Bun-first, minimal Next.js starter for quickly creating new company projects. It runs inside the Eazo platform as an iframe app and includes a complete example of the unified authentication flow that works across both Eazo Mobile and the web.

## Stack

- Next.js 16 with App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Bun (package manager + local script runner)
- `@eazo/auth` `0.2.0` — unified auth SDK: `EazoAuthClient` (browser) + `EazoAuthServer` (server), Mobile bridge, GenAuth web login, encrypted session handling
- shadcn/ui — pre-installed UI component library (`src/components/ui/`)
- lucide-react — icon library
- framer-motion — animation library
- Drizzle ORM — database ORM and migration manager (PostgreSQL via `drizzle-orm` + `postgres.js`)
- Zustand — client-side auth state (`src/stores/useAuthStore.ts`)

## Use This Template

1. Copy this project to start a new app.
2. Rename the package in `package.json`.
3. Update app metadata in `src/app/layout.tsx`.
4. Replace the demo content in `src/app/page.tsx`.
5. Add product-specific routes, components, and data logic from there.

## Commands

```bash
bun install
bun dev
bun run lint
bun run build
bun start
```

### Database (Drizzle)

```bash
bun run db:generate   # generate SQL migration from schema changes
bun run db:migrate    # apply pending migrations to the database
bun run db:push       # push schema directly to DB (dev only, no migration files)
bun run db:studio     # open Drizzle Studio GUI
bun run db:drop       # drop a specific migration file
```

## Project Structure

```
src/
  app/
    api/
      user/profile/route.ts   — GET: unified auth endpoint (Mobile + Web)
      todos/route.ts           — GET (list) + POST (create) todos
      todos/[id]/route.ts      — GET / PATCH / DELETE single todo
    todos/page.tsx             — Todo List demo page
    layout.tsx                 — root layout; mounts AuthInit + LoginModal
    page.tsx                   — home / demo page
  components/
    auth/
      auth-init.tsx            — initializes auth store on app start
      login-modal.tsx          — GenAuth login modal (social + email)
    user-profile/
      user-badge.tsx           — avatar badge + dropdown (reads auth store)
    todo-list/                 — Todo List page component
    ui/                        — shadcn/ui primitives (do not edit directly)
  lib/
    api/
      request.ts               — request() — injects x-eazo-session for both environments
      user-profile.ts          — fetchUserProfile() — calls /api/user/profile
      todos.ts                 — getTodos / createTodo / updateTodo / deleteTodo
      index.ts                 — re-exports all API helpers
    auth/
      client.ts                — EazoAuthClient singleton (browser, uses NEXT_PUBLIC_EAZO_PUBLIC_KEY)
      server.ts                — EazoAuthServer singleton (Node.js, uses EAZO_PRIVATE_KEY)
      index.ts                 — requireAuth() Next.js adapter (~30 lines)
    db/
      schema/                  — Drizzle table definitions + TS types
      queries/                 — db client + CRUD query functions
      migrate.ts               — migration runner
      migrations/              — auto-generated SQL files (commit to git)
  stores/
    useAuthStore.ts            — Zustand auth store (user, loading, login actions, social connections)
  utils/
    token.ts                   — localStorage SessionToken helpers (getSession / setSession / removeSession)
    utils.ts                   — cn() Tailwind class helper
drizzle.config.ts
next.config.ts
components.json                — shadcn/ui config
```

## Authentication

Authentication is handled by `@eazo/auth`. Both Eazo Mobile and Web users end up with the same encrypted `SessionToken` that the server decrypts with `EAZO_PRIVATE_KEY` — no JWT / JWKS path needed.

### How It Works

```
Eazo Mobile                          Web (GenAuth)
────────────────────────────         ────────────────────────────
auth.loginByEazoMobile()             auth.loginWithSocial()
(bridge postMessage)                 auth.loginWithEmailPassword()
         ↓                           auth.loginWithEmailCode()
         ↓                                    ↓
         POST /api/open/app-session-token (publicKey)
         ↓                                    ↓
  SessionToken (encrypted)           SessionToken (encrypted)
x-eazo-session: <JSON>             x-eazo-session: <JSON>
         ↓                                    ↓
         GET /api/user/profile  (requireAuth)
                    ↓
         EazoAuthServer.verifySession()
         ECC secp256k1 + AES-256-GCM decrypt
                    ↓
         UserInfo { userId, email, nickname, avatarUrl, … }
                    ↓
          useAuthStore.user (Zustand)
                    ↓
             UserBadge (unified UI)
```

### SDK Singletons

**Client** (`src/lib/auth/client.ts`) — browser-side, no private key:

```ts
import { EazoAuthClient } from "@eazo/auth";

export const auth = new EazoAuthClient({
  publicKey: process.env.NEXT_PUBLIC_EAZO_PUBLIC_KEY!,
});
```

Exposes: `auth.isEazoMobile()`, `auth.loginByEazoMobile()`, `auth.loginWithSocial()`, `auth.loginWithEmailPassword()`, `auth.loginWithEmailCode()`, `auth.sendEmailCode()`, `auth.fetchSocialConnections()`.

**Server** (`src/lib/auth/server.ts`) — Node.js only:

```ts
import { EazoAuthServer } from "@eazo/auth";

export const authServer = new EazoAuthServer({
  privateKey: process.env.EAZO_PRIVATE_KEY!,
});
```

Exposes: `authServer.verifySession(session: SessionToken): UserInfo`.

### Environment Detection

`auth.isEazoMobile()` returns `true` when `navigator.userAgent` contains `"EAZO"`. Used in `initAuth`.

### Client Side

**`AuthInit`** (`src/components/auth/auth-init.tsx`) — calls `initAuth()` once on mount for both environments.

**`initAuth()`** (`src/stores/useAuthStore.ts`):
- Mobile: calls `fetchUserProfile()` — bridge session is auto-injected as `x-eazo-session` by `request()`
- Web: skips the network call if no `SessionToken` is in `localStorage`; otherwise calls the same endpoint

**Login actions** (web only — Mobile users are already authenticated by the host):
- `loginWithSocial(identifier)` — opens the GenAuth social popup
- `loginWithEmailPassword(email, password)`
- `loginWithEmailCode(email, code)` + `sendEmailCode(email)`

All login actions receive a `SessionToken` from the SDK, save it to `localStorage` via `setSession()`, then fetch the canonical profile from `/api/user/profile` before writing to the store.

### Server Side

**`requireAuth(request)`** (`src/lib/auth/index.ts`) — synchronous Next.js adapter:

```ts
import { requireAuth } from "@/lib/auth";

export function GET(request: NextRequest) {
  const result = requireAuth(request);
  if (!result.ok) return result.response; // 401 JSON response
  // result.user: UserInfo
}
```

Reads `x-eazo-session` from the request header, parses it as `SessionToken`, and delegates decryption to `authServer.verifySession()`.

### Making Authenticated API Calls

Use `request` as a drop-in replacement for `fetch` in client components:

```ts
import { request } from "@/lib/api/request";

const res = await request("/api/my-endpoint");
```

It automatically injects the correct `x-eazo-session` header for the current environment.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `EAZO_PRIVATE_KEY` | Yes | Hex-encoded 64-char private key from Eazo developer settings. Server-side only. |
| `NEXT_PUBLIC_EAZO_PUBLIC_KEY` | Yes | Public key for exchanging GenAuth JWTs for encrypted session tokens. |
| `DATABASE_URL` | If using DB | `postgresql://USER:PASSWORD@HOST:PORT/DATABASE` |
| `NEXT_PUBLIC_GENAUTH_APP_ID` | Web login | GenAuth Application ID (optional, SDK has a default) |
| `NEXT_PUBLIC_GENAUTH_APP_DOMAIN` | Web login | GenAuth tenant domain (optional, SDK has a default) |

Copy `.env.example` to `.env` to configure locally.

## UI Components

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

Add more: `bunx shadcn@latest add <component>`

For icons: `import { User, Settings } from "lucide-react"`

For animation: `import { motion } from "framer-motion"`

## Adding New Pages

Each URL maps to a `page.tsx` under `src/app/`. Extract non-trivial UI into `src/components/<feature>/` and keep `page.tsx` as a thin entry point.

**1. Route file** (`src/app/dashboard/page.tsx`):

```tsx
import { DashboardPage } from "@/components/dashboard";
export default function Dashboard() {
  return <DashboardPage />;
}
```

**2. Page component** (`src/components/dashboard/index.tsx`):

```tsx
"use client";
import { useAuthStore } from "@/stores/useAuthStore";

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  // ...
}
```

**3. If the page needs the current user** — read `useAuthStore((s) => s.user)`. It is populated on app start by `AuthInit` for both environments. No per-component fetching needed.

**4. If the page needs a new API route** — add `src/app/api/<resource>/route.ts` and protect it with `requireAuth`.

## Project Rules

- Prefer Bun for all install and script commands.
- Keep the template lean and framework-native.
- Do not add a UI kit, state library, auth layer, ORM, or API client unless the project explicitly needs it.
- Prefer small, composable local components over heavy abstractions.
- Keep demo code out of new product code.
- Before shipping, run `bun run lint` and `bun run build`.

## Styling

- Tailwind is enabled globally.
- Global styles: `src/app/globals.css`.
- Add design tokens only when the target project has a clear visual system.

## Goal

Start fast, stay flexible, and only add complexity when there is a concrete product requirement.
