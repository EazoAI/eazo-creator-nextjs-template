# Agent Guide

This repository is a Bun-first, minimal Next.js starter for building apps that run on the Eazo platform — seamlessly in a browser and inside the Eazo Mobile WebView.

## Stack

- Next.js 16 with App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Bun (package manager + local script runner)
- `@eazo/sdk` — capability-first SDK: `auth`, `device`, React integration, server-side `requireAuth`
- `@eazo/auth` — underlying auth primitive (GenAuth login + encrypted session decryption); used internally by `@eazo/sdk`
- shadcn/ui, lucide-react, framer-motion
- Drizzle ORM (PostgreSQL via `drizzle-orm` + `postgres.js`)
- Zustand — UI-local state (modal visibility, cached social providers list)

## Use This Template

1. Copy this project to start a new app.
2. Rename the package in `package.json`.
3. Run `bun run cleanup:demo` before any feature development to remove all template demo artifacts.
4. Update app metadata in `src/app/layout.tsx`.
5. Replace the default content in `src/app/page.tsx`.
6. Add product-specific routes, components, and data logic from there.

## Commands

```bash
bun install
bun dev
bun run lint
bun run build
bun start
bun run cleanup:demo   # one-click remove demo artifacts and auto-fix stale todos exports in index files
```

If you are developing `@eazo/sdk` or `@eazo/auth` locally, build them first and sync into `node_modules`:

```bash
(cd ../eazo-sdk/auth && npm install && npm run build)
(cd ../eazo-sdk/sdk && npm install && npm run build)
bun run sdk:sync
```

### Database (Drizzle)

```bash
bun run db:generate
bun run db:migrate
bun run db:push
bun run db:studio
```

## Project Structure

```
src/
  app/
    api/
      user/profile/route.ts   — GET: returns the authenticated user
      todos/route.ts          — GET (list) + POST (create)
      todos/[id]/route.ts     — GET / PATCH / DELETE
    layout.tsx                — root layout; mounts <EazoProvider> + <LoginModal>
    page.tsx                  — demo page
  components/
    auth/
      login-modal.tsx         — calls auth.loginWith* from @eazo/sdk
    user-profile/
      user-badge.tsx          — reads user via useEazo(s => s.auth.user)
    todo-list/                — Todo List demo
    ui/                       — shadcn/ui primitives
  lib/
    api/
      request.ts              — fetch wrapper; injects x-eazo-session via auth.getSessionHeader()
      user-profile.ts         — fetchUserProfile() → GET /api/user/profile
      todos.ts                — getTodos / createTodo / updateTodo / deleteTodo
    auth/
      index.ts                — re-exports requireAuth from @eazo/sdk/server
    db/
      schema/                 — Drizzle table definitions
      queries/                — db client + CRUD helpers
      migrations/             — auto-generated SQL files (commit to git)
  stores/
    useAuthStore.ts           — Zustand UI state (login modal visibility, social connections cache)
  utils/
    utils.ts                  — cn() Tailwind class helper
```

## Capabilities

The platform exposes capabilities through `@eazo/sdk`. Import them directly; they work the same in browsers and inside Eazo Mobile.

### `auth`

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

### `device`

```ts
import { device } from "@eazo/sdk";

device.platform      // 'web' | 'mobile'
device.locale        // 'zh-CN' | ...
device.safeArea      // { top, bottom }
device.backendUrl    // platform backend URL
```

### React integration

```tsx
import { EazoProvider, useEazo } from "@eazo/sdk/react";

<EazoProvider>{children}</EazoProvider>

// In a component: read state via useEazo(selector)
const user = useEazo((s) => s.auth.user);

// In event handlers / effects: call the singleton directly
<button onClick={() => auth.loginWithSocial("google")}>Sign in</button>
```

**Rule**: inside render, read reactive state via `useEazo(selector)`. Outside render (event handlers, effects, non-React code), use `auth.xxx` / `device.xxx` directly.

### Login actions

All login methods live on the `auth` capability from `@eazo/sdk`. Mobile users are already authenticated by the host, so these are effectively web-only:

- `auth.loginWithSocial(identifier)` — opens the GenAuth social popup
- `auth.loginWithEmailPassword(email, password)`
- `auth.loginWithEmailCode(email, code)` + `auth.sendEmailCode(email)`

The SDK persists the session internally (localStorage on web, host-bridge on Eazo Mobile) and publishes the new `user` through the reactive store — components subscribed via `useEazo(s => s.auth.user)` update automatically.

### Using the Login Components (mandatory)

The template ships with a fully-wired login flow. **Always use these existing components — never build a custom login flow or render a plain "Please log in" text.**

| Component | Location | What it does |
|---|---|---|
| `<LoginModal />` | `src/components/auth/login-modal.tsx` | Full login UI: social + email/password + email code. Calls `auth.loginWith*` from `@eazo/sdk`. |
| `<UserBadge />` | `src/components/user-profile/user-badge.tsx` | Avatar + logout dropdown. Reads user via `useEazo`. |

`<LoginModal />` is mounted inside `<EazoProvider>` in `src/app/layout.tsx`. Session restoration happens automatically — no `<AuthInit />` needed. To open the login modal from anywhere, call `useAuthStore((s) => s.openLoginModal)()`.

**Gating a page behind auth — correct pattern:**

```tsx
"use client";
import { useEazo } from "@eazo/sdk/react";
import { useAuthStore } from "@/stores/useAuthStore";
import { Button } from "@/components/ui/button";

export function MyFeaturePage() {
  const user = useEazo((s) => s.auth.user);
  const loading = useEazo((s) => s.auth.loading);
  const openLoginModal = useAuthStore((s) => s.openLoginModal);

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground">请先登录后继续</p>
        <Button onClick={openLoginModal}>登录</Button>
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

### Server

```ts
import { requireAuth } from "@/lib/auth"; // re-exports @eazo/sdk/server

export function GET(request: NextRequest) {
  const r = requireAuth(request);
  if (!r.ok) return r.response;
  // r.user: { id, email, name, avatarUrl }
}
```

### Authenticated API calls

```ts
import { request } from "@/lib/api/request";
const res = await request("/api/my-endpoint");  // x-eazo-session auto-injected
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `EAZO_PRIVATE_KEY` | Yes (server) | Hex-encoded 64-char private key; used by `requireAuth` to decrypt sessions |
| `NEXT_PUBLIC_EAZO_PUBLIC_KEY` | Yes (browser) | Developer public key; used when exchanging a GenAuth JWT for a session token |
| `NEXT_PUBLIC_EAZO_API_URL` | Optional | Eazo platform backend URL exposed via `device.backendUrl` (web fallback) |
| `DATABASE_URL` | If using DB | `postgresql://USER:PASS@HOST:PORT/DATABASE` |
| `NEXT_PUBLIC_GENAUTH_APP_ID` | Optional | Override GenAuth App ID default |
| `NEXT_PUBLIC_GENAUTH_APP_DOMAIN` | Optional | Override GenAuth tenant domain default |

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

Add more: `bunx shadcn@latest add <component>`. Icons: `lucide-react`. Animation: `framer-motion`.

## Adding New Pages

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

## Coding Requirements

### Component Encapsulation (mandatory)

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

### File Size Limits

| File type | Soft limit | Hard limit |
|---|---|---|
| Page component (`page.tsx`) | 30 lines | 50 lines |
| Feature component | 150 lines | 250 lines |
| Utility / helper | 80 lines | 150 lines |
| API route handler | 60 lines | 100 lines |

When a file approaches its hard limit, split it before continuing.

### Naming Conventions

- Component files: `kebab-case.tsx` (e.g. `user-profile-card.tsx`)
- Component exports: `PascalCase` named export (e.g. `export function UserProfileCard`)
- Each feature folder exposes a barrel `index.tsx` that re-exports the top-level component.
- API helpers: `camelCase` functions in `src/lib/api/<resource>.ts`.

### State and Data

- Do not fetch data directly inside a `page.tsx`. Delegate to a client component or a server component that lives in `src/components/`.
- Read auth state with `useAuthStore((s) => s.user)` — do not re-fetch profile inside individual components.
- Keep Zustand stores in `src/stores/`. Do not create ad-hoc `useState` sprawl across multiple files for shared state.

### API Requests (mandatory)

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

### Imports

- Use `@/` path aliases everywhere — no relative `../../` chains.
- Import UI primitives from `@/components/ui/`, not directly from shadcn source paths.

## Project Rules

- Prefer Bun for all install and script commands.
- Keep the template lean and framework-native.
- Do not reach into `@eazo/sdk` internals. The public surface is `auth`, `device`, `useEazo`, `EazoProvider`, `requireAuth`, and semantic types.
- Keep demo code out of new product code.
- Before starting feature development, run `bun run cleanup:demo` to remove all demo/example artifacts (TodoList pages/components, demo API routes, demo DB schema/migrations) and auto-clean stale `./todos` exports in index files.
- Before shipping, run `bun run lint` and `bun run build`.

## Goal

Start fast, stay flexible, and only add complexity when there is a concrete product requirement.
