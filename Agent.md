# Agent Guide

This repository is a Bun-first, minimal Next.js starter for quickly creating new company projects. It runs inside the Eazo platform as an iframe app and includes a complete example of the Eazo user authentication flow.

## Stack

- Next.js 16 with App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Bun as the package manager and default runtime for local scripts
- `@eazo/node-sdk` for server-side decryption of user session tokens
- shadcn/ui — pre-installed UI component library (`src/components/ui/`)
- lucide-react — icon library
- framer-motion — animation library
- Drizzle ORM — database ORM and migration manager (PostgreSQL, via `drizzle-orm` + `postgres.js`)

## UI Components

shadcn/ui is initialized and the following components are ready to use from `@/components/ui/`:

| Component | Import |
|---|---|
| Button | `import { Button } from "@/components/ui/button"` |
| Card | `import { Card, CardContent, CardHeader, CardTitle, ... } from "@/components/ui/card"` |
| Dialog | `import { Dialog, DialogContent, DialogHeader, ... } from "@/components/ui/dialog"` |
| Input | `import { Input } from "@/components/ui/input"` |
| Label | `import { Label } from "@/components/ui/label"` |
| Select | `import { Select, SelectContent, SelectItem, ... } from "@/components/ui/select"` |
| Sheet | `import { Sheet, SheetContent, SheetHeader, ... } from "@/components/ui/sheet"` |
| Tabs | `import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"` |
| Textarea | `import { Textarea } from "@/components/ui/textarea"` |
| Sonner (toast) | `import { Toaster } from "@/components/ui/sonner"` |

To add more shadcn/ui components: `bunx shadcn@latest add <component>`

For icons, use lucide-react: `import { User, Settings } from "lucide-react"`

For animations, use framer-motion: `import { motion } from "framer-motion"`

## Use This Template Like This

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
bun run db:generate   # generate a new SQL migration from schema changes
bun run db:migrate    # apply pending migrations to the database
bun run db:push       # push schema directly to DB without migration files (dev only)
bun run db:studio     # open Drizzle Studio GUI
bun run db:drop       # drop a specific migration file
```

## Structure

- `src/app`: routes, layout, global styles
- `src/app/api/user/profile/route.ts`: POST endpoint that decrypts the Eazo session token and returns user info
- `src/app/api/todos/route.ts`: GET (list) + POST (create) todos
- `src/app/api/todos/[id]/route.ts`: GET / PATCH / DELETE a single todo
- `src/app/todos/page.tsx`: Todo List demo page
- `src/components/ui/`: shadcn/ui primitives (Button, Card, Dialog, Input, etc.) — do not edit directly
- `src/components/user-profile/`: example UI that fetches and displays the authenticated user
- `src/components/todo-list/`: Todo List page component and sub-components
- `src/lib/db/schema.ts`: Drizzle table definitions and exported TypeScript types
- `src/lib/db/queries.ts`: Drizzle `db` client instance + all CRUD query functions
- `src/lib/db/migrate.ts`: migration runner script (`bun run db:migrate`)
- `src/lib/db/migrations/`: auto-generated SQL migration files — **commit to git**
- `drizzle.config.ts`: Drizzle Kit configuration (schema path, output dir, connection)
- `public`: static assets
- `components.json`: shadcn/ui configuration
- `next.config.ts`: Next.js config
- `eslint.config.mjs`: lint rules

## Eazo Authentication Flow

> **Applies to: Eazo Mobile only.**
> This flow is used when the app runs embedded inside the Eazo Mobile client as a WebView/iframe. The host injects the user session via `postMessage`.
> If your app runs on the web (standalone browser, not embedded), this flow does not apply — use your own authentication mechanism instead.

This app runs inside an Eazo iframe. The platform injects the current user's identity as an encrypted session token, which the app must request, forward to its own backend, and decrypt there. The flow has four steps:

### 1. Request the encrypted token (browser)

The client calls `session.getToken` via the Eazo postMessage bridge. The host page encrypts the user's info with the app's registered public key (ECC secp256k1 + AES-256-GCM) and replies with a payload:

```ts
// src/utils/eazo-bridge.ts
requestBridgeApi("session.getToken")
// → { encryptedData, encryptedKey, iv, authTag }
```

`requestBridgeApi` handles the full `postMessage` request/response lifecycle, including a 5-second timeout. All received `message` events and bridge errors are logged with the `[eazo-bridge]` prefix.

### 2. Forward the payload to the backend (browser → server)

The client POSTs the raw encrypted payload to the app's own API route. Decryption must never happen in the browser.

```ts
// src/utils/user-profile.ts
POST /api/user/profile
Body: { encryptedData, encryptedKey, iv, authTag }
```

### 3. Decrypt server-side (server)

The API route (`src/app/api/user/profile/route.ts`) reads `EAZO_PRIVATE_KEY` from the environment and calls `decryptUserInfo` from `@eazo/node-sdk`:

```ts
import { decryptUserInfo } from "@eazo/node-sdk";

const user = decryptUserInfo({ encryptedData, encryptedKey, iv, authTag, privateKey });
// → { userId, email, nickname, avatarUrl, lang, region, createdAt }
```

### 4. Return the user info to the client

The route responds with `{ ok: true, user }`. The client component (`src/components/user-profile/index.tsx`) updates state to `success` and renders `ProfileCard`.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `EAZO_PRIVATE_KEY` | Yes | Hex-encoded 64-character private key from the Eazo developer settings. Used only server-side. |
| `DATABASE_URL` | Yes (if using DB) | PostgreSQL connection string. Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE` |

Copy `.env.example` to `.env` to configure locally.

## Adding New Pages

This project uses the Next.js App Router. Each URL route maps to a `page.tsx` file inside `src/app/`. For pages with non-trivial UI or state, extract the page component into `src/components/<feature>/` and keep `page.tsx` as a thin entry point.

### Example: adding a `/dashboard` route

**1. Create the route file**

```
src/app/dashboard/page.tsx
```

```tsx
import { DashboardPage } from "@/components/dashboard";

export default function Dashboard() {
  return <DashboardPage />;
}
```

**2. Create the page component**

```
src/components/dashboard/
  index.tsx        ← "use client" orchestrator (state, data fetching)
  dashboard-card.tsx
  ...
```

**3. If the page needs the current user**, call `fetchUserProfile()` from `@/utils/user-profile` — it handles the bridge + backend decryption flow automatically. See `src/components/user-profile/index.tsx` for a working example.

**4. If the page needs a new API route**, add it under `src/app/api/`:

```
src/app/api/<resource>/route.ts
```

### Conventions

- `src/app/` — routes only (`page.tsx`, `layout.tsx`, `loading.tsx`, API routes)
- `src/components/<feature>/` — page components and their sub-components grouped by feature
- `src/utils/` — shared logic (bridge, data fetching helpers)

## Project Rules

- Prefer Bun for all install and script commands.
- Keep the template lean and framework-native.
- Do not add a UI kit, state library, auth layer, ORM, or API client unless the project explicitly needs it.
- Prefer small, composable local components over heavy abstractions.
- Keep demo code out of new product code.
- Before shipping changes, run `bun run lint` and `bun run build`.

## Styling

- Tailwind is already enabled.
- Global styles live in `src/app/globals.css`.
- Add design tokens only when the target project has a clear visual system.

## Goal

Start fast, stay flexible, and only add complexity when there is a concrete product requirement.
