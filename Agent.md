# Agent Guide

This repository is a Bun-first, minimal Next.js starter for quickly creating new company projects. It runs inside the Eazo platform as an iframe app and includes a complete example of the unified authentication flow that works across both Eazo Mobile and the web.

## Stack

- Next.js 16 with App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Bun (package manager + local script runner)
- `@eazo/node-sdk` — server-side decryption of Eazo Mobile session tokens
- `jose` — JWKS-based JWT verification for web (GenAuth/Authing)
- `authing-js-sdk` — GenAuth client for web login (social, email/password, email code)
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
      types.ts                 — UserInfo, Status types
    todo-list/                 — Todo List page component
    ui/                        — shadcn/ui primitives (do not edit directly)
  hooks/
    useSocialConnections.ts    — fetches GenAuth social login providers
  lib/
    auth/
      index.ts                 — server-side requireAuth() (Mobile + Web, JWKS)
      authing.ts               — lazily-instantiated AuthenticationClient (GenAuth)
      token.ts                 — localStorage JWT helpers (get/set/remove)
      eazo-bridge.ts           — postMessage bridge to Eazo Mobile host
    api/
      fetch-with-auth.ts       — fetchWithAuth() + isEazoMobile()
      genauth.ts               — fetchGenAuthPublicConfig
      todos.ts                 — getTodos / createTodo / updateTodo / deleteTodo
      index.ts                 — re-exports all API helpers
    auth/
      index.ts                 — server-side requireAuth() (Mobile + Web, JWKS)
      token.ts                 — localStorage JWT helpers (get/set/remove)
      eazo-bridge.ts           — postMessage bridge to Eazo Mobile host
    db/
      schema/                  — Drizzle table definitions + TS types
      queries/                 — db client + CRUD query functions
      migrate.ts               — migration runner
      migrations/              — auto-generated SQL files (commit to git)
  stores/
    useAuthStore.ts            — Zustand auth store (user, loading, login actions)
  utils/
    utils.ts                   — cn() Tailwind class helper
drizzle.config.ts
next.config.ts
components.json                — shadcn/ui config
```

## Authentication

The app supports two environments. The login mechanism differs, but after authentication both produce the same `UserInfo` and populate the same Zustand store.

### How It Works

```
Eazo Mobile                          Web (GenAuth)
────────────────────────────         ────────────────────────────
bridge → session.getToken()          Authing JS SDK → JWT
x-eazo-session: <encrypted>          Authorization: Bearer <JWT>
         ↓                                    ↓
         GET /api/user/profile  (requireAuth)
        /                                      \
decryptUserInfo()                         jwtVerify() + JWKS RS256
(@eazo/node-sdk)                          (jose, ${DOMAIN}/oidc/.well-known/jwks.json)
        \                                      /
         → UserInfo { userId, email, nickname, avatarUrl, ... }
                          ↓
               useAuthStore.user (Zustand)
                          ↓
                  UserBadge (unified UI)
```

### Environment Detection

`isEazoMobile()` (`src/utils/fetch-with-auth.ts`) returns `true` when `navigator.userAgent` contains `"EAZO"`. All auth branching is done here and in `requireAuth()` on the server.

### Client Side

**`AuthInit`** (`src/components/auth/auth-init.tsx`) — calls `initAuth()` once on mount for both environments.

**`initAuth()`** (`src/stores/useAuthStore.ts`):
- Mobile: calls `fetchWithAuth("/api/user/profile")` — bridge session is auto-injected as `x-eazo-session`
- Web: skips the network call if no JWT is in `localStorage`; otherwise calls the same endpoint with `Authorization: Bearer <token>`

**Login actions** (web only — Mobile users are already authenticated by the host):
- `loginWithSocial(identifier)` — opens the GenAuth social popup
- `loginWithEmailPassword(email, password)`
- `loginWithEmailCode(email, code)` + `sendEmailCode(email)`

All login actions save the JWT to `localStorage` via `setToken()`, then fetch the canonical profile from `/api/user/profile` (which runs JWKS verification) before writing to the store.

### Server Side

**`requireAuth(request)`** (`src/utils/auth.ts`) — unified guard for API routes:

```ts
import { requireAuth } from "@/utils/auth";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth.response; // 401 JSON response
  // auth.user: UserInfo
}
```

- **Mobile**: reads `x-eazo-session` header, decrypts with `EAZO_PRIVATE_KEY` via `@eazo/node-sdk`
- **Web**: reads `Authorization: Bearer <JWT>`, verifies signature against GenAuth JWKS (`RS256`, exp checked, aud/iss not required)

### Making Authenticated API Calls

Use `fetchWithAuth` as a drop-in replacement for `fetch` anywhere in client components:

```ts
import { fetchWithAuth } from "@/utils/fetch-with-auth";

const res = await fetchWithAuth("/api/my-endpoint");
```

It automatically injects the correct header for the current environment.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `EAZO_PRIVATE_KEY` | Mobile only | Hex-encoded 64-char private key from Eazo developer settings. Server-side only. |
| `DATABASE_URL` | If using DB | `postgresql://USER:PASSWORD@HOST:PORT/DATABASE` |
| `NEXT_PUBLIC_GENAUTH_APP_ID` | Web login | GenAuth Application ID |
| `NEXT_PUBLIC_GENAUTH_APP_DOMAIN` | Web login | GenAuth tenant domain, e.g. `https://your-tenant.genauth.ai`. JWKS URL is derived automatically: `${DOMAIN}/oidc/.well-known/jwks.json` |

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
