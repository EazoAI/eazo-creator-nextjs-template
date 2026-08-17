# Agent Guide

This template is a Bun-first Next.js starter for Eazo platform apps that run in the browser and inside the Eazo Mobile WebView.

## Scope

This file governs generated app code quality: framework conventions, app structure, i18n, Eazo SDK usage, API boundaries, CSS rules, component structure, local commands, and validation.

It does not govern Creator build orchestration.

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, Bun.
- `@eazo/sdk` public surface: `auth`, `device`, `ai`, `storage`, `memory`, `notifications`, `useEazo`, `EazoProvider`, `requireAuth`, and semantic types. Do not reach into SDK internals.
- shadcn/ui source components, lucide-react, framer-motion.
- Drizzle ORM with PostgreSQL through `drizzle-orm` and `postgres.js`.
- App UI i18n uses `i18next` + `react-i18next` with `en-US` and `zh-CN`.

## Generated App Contract

- The app title and description come from `NEXT_PUBLIC_APP_TITLE` and `NEXT_PUBLIC_APP_DESCRIPTION`, stamped by the platform at scaffold time. Do not hardcode product title or description in `src/app/layout.tsx`.
- Prefer Bun for install and scripts.
- Before shipping, run `bun run lint` and `bun run build`.

## Must Preserve

- `src/app/layout.tsx` keeps the platform provider chain: `I18nProvider`, `EazoProvider`, `UserSyncEffect`, `LocaleSyncEffect`, and `Toaster`.
- `src/app/layout.tsx` keeps `h-full` on both `<html>` and `<body>` so percentage-height app roots have a definite viewport height in Mobile WebView.
- `src/app/layout.tsx` keeps the Eazo brand-banner drop-in `<Script>` (`https://cdn.eazo.ai/branding/eazo-brand-banner.js`, wired with `data-eazo-app-id` from `EAZO_APP_ID`). `@eazo/sdk` no longer renders the web→app handoff banner itself, so this hosted script is what paints the Eazo branding on plain web. Keep it loaded via `next/script` with `strategy="afterInteractive"`; the script self-guards (no double mount) and no-ops inside the Eazo Mobile WebView and embedded iframes. Do not rebuild a custom branding banner in app code.
- `src/components/user-profile/user-sync-effect.tsx` keeps Mobile login convergence through `GET /api/user/profile`.
- `src/app/api/user/profile/route.ts` keeps authenticated profile hydration and local user upsert.
- `src/lib/auth/index.ts` remains the app's `requireAuth` re-export.
- `src/lib/api/request.ts` remains the API request wrapper that injects auth and locale headers.
- `src/i18n/locales/en-US.json` and `src/i18n/locales/zh-CN.json` remain the required locale files.
- The local `users` table remains in the app database. New user-facing features should join against the local `users` table instead of relying only on SDK session state.
- `src/app/api/mcp/route.ts` remains transport glue; app-specific MCP tools belong in `src/lib/mcp/tools/`.
- `src/components/eazo/preview-inspector.tsx` and the `data-eazo-preview-inspector-runtime` marker on `<body>` in `src/app/layout.tsx` remain intact. They are the native Canvas point-select bridge; do not remove or rename them.

## Canvas Point-Select (data-el)

The Creator Canvas renders this app inside an iframe and lets the user click any
element to target it in chat. Selection precedence is
`data-el` > `data-eazo-component` > `data-testid` > `id` > CSS path, so the only
reliable, stable anchor is `data-el`.

- Every meaningful, product-semantic element (page sections, cards, list items,
  primary CTAs, nav entries, form groups) must carry a stable, human-readable
  `data-el` attribute. Prefer feature-scoped kebab-case names, e.g.
  `data-el="todo-list-add-form"`, `data-el="todo-item"`, `data-el="nav-home"`.
- Keep `data-el` values stable across edits so a re-selection keeps pointing at
  the same logical element. Do not derive them from volatile data (ids, indexes).
- Reusable shared primitives may also expose `data-eazo-component="..."` for a
  coarser component-level anchor; business elements still get `data-el`.
- The bridge is inert unless `NEXT_PUBLIC_EAZO_INSPECTOR === "1"` and the app is
  running inside the Creator iframe, so `data-el` has zero runtime cost in
  production. Never gate real behavior on these attributes.

## Design Tokens

The selected design direction is captured as `tokens.json` (colors, typography,
radius, spacing, shadow). The platform maps it onto the shadcn CSS variable
slots in `src/app/globals.css` (`:root` / `.dark`) at build time.

- Style product UI through the token-backed CSS variables and Tailwind theme
  (`--primary`, `--secondary`, `--accent`, `--muted`, `--border`, `--ring`,
  `--radius`, `--font-sans`, `--font-heading`, ...). Do not hardcode raw hex/oklch
  colors or fixed radii in product components when a token slot exists.
- Keep the `:root` / `.dark` variable slots and the `@theme inline` mapping in
  `globals.css` intact so token injection stays a pure value swap. Add new tokens
  as new `:root` variables plus a matching `@theme inline` entry; never inline
  literal design values into components that a token could express.

## Reference Files

Read the existing implementation before changing a platform capability.

| Area | Read first | Non-negotiable rule |
| --- | --- | --- |
| Providers | `src/app/layout.tsx` | Keep the provider chain intact. |
| Auth | `src/lib/auth/index.ts`, `src/app/api/user/profile/route.ts`, `src/components/user-profile/user-badge.tsx` | Do not build a custom login UI. |
| API client | `src/lib/api/request.ts`, `src/lib/api/user-profile.ts` | Components call typed API helpers, not raw `fetch`. |
| Database | `src/lib/db/schema/`, `src/lib/db/queries/`, `src/lib/db/client.ts` | Keep the local `users` table and profile upsert. |
| i18n | `src/i18n/`, `src/components/i18n/language-switcher.tsx`, `src/lib/i18n/server-locale.ts` | Maintain `en-US` and `zh-CN`. |
| MCP | `src/app/api/mcp/route.ts`, `src/lib/mcp/server.ts`, `src/lib/mcp/tools/` | User-data tools require authenticated `userId` scope. |

## Platform Capability Rules

### Providers and Auth

- `@eazo/sdk` owns login. Web uses the SDK login UI; Eazo Mobile routes to native host login. App code should trigger `auth.login()` / `auth.showLogin()` instead of building a custom login form.
- Read reactive auth/device state with `useEazo(selector)` inside components. Use SDK singletons such as `auth` and `device` in event handlers, effects, route handlers, or non-React code.
- Guard private API routes with `requireAuth(request)`. If `requireAuth` fails, return its response.
- Scope private records by the authenticated `user.id`; never trust a user id supplied in request input.
- `GET /api/user/profile` upserts the local user. Web hydration and Mobile `UserSyncEffect` both converge there.
- Auth-gated UI must expose a real SDK login action when no user is present. Auth-gated API routes must call `requireAuth(request)` before reading or mutating user data.

### Database and API Boundaries

- Keep Drizzle schema, queries, and migrations under `src/lib/db/`.
- Commit generated migrations.
- All API call logic must live in `src/lib/api/`. Components and pages import typed helpers from `src/lib/api`, not raw `fetch` or direct `request()` calls.
- API functions must have explicit parameter and return types. Error handling belongs in the API layer instead of being scattered across components.
- Query helpers should accept `userId` where data is private, and route handlers should never trust ownership fields from request JSON.
- Client components should call typed helpers from `src/lib/api/index.ts`, not endpoint strings inline.

### i18n

- Every product app keeps app UI support for both `en-US` and `zh-CN`. The creator chat language does not remove this requirement.
- `I18nProvider` wraps `EazoProvider`; `LocaleSyncEffect` follows `device.locale` while locale preference is `system`.
- Add user-visible copy to both `src/i18n/locales/en-US.json` and `src/i18n/locales/zh-CN.json`.
- Client components render user-visible copy through `useTranslation()` and `t(...)`.
- `request()` sends `x-app-locale`; route handlers resolve locale with `getRequestLocale(request)`.
- Locale keys should be organized by feature or screen, not dumped into generic single-word keys.
- Locale-sensitive formatting is user-visible copy: pass explicit BCP-47 locales to `Intl.*` or `toLocale*` calls instead of using browser defaults.
- Keep SDK login/banner UI as provided by SDK; this i18n contract is for the app's product UI.

### AI

- `ai` is server-side only. Never import or call `ai` in `"use client"` files, components, hooks, browser code, or `src/lib/api/` helpers.
- AI flow is always: client component -> API route -> `ai.chat()` -> HTTP response back to the client.
- Guard private AI routes with `requireAuth` before invoking `ai.chat()`.
- Do not install `openai`; Eazo SDK re-exports the relevant OpenAI-compatible types.
- Keep `EAZO_PRIVATE_KEY` on the server side only.

### Memory

- Call `memory.reportAction()` from client code after meaningful mutations such as create, update, delete, upload, attach, or completing a significant workflow step.
- Always chain `.catch(() => {})`; Gum failures must never break core user flows.
- Do not report read-only fetches, keystrokes, scroll events, or server-side route-handler work.
- `metadata` should include a `type` field and relevant business identifiers, but never secrets or large payloads.

### Notifications

- Use notifications only for real reminders, timers, alarms, recurring nudges, or push workflows that must reach the user outside the foreground WebView.
- Server fan-out goes through `notifications.publish` from `@eazo/sdk/server` and requires platform env vars.
- Scheduled notifications belong in API routes plus `vercel.json#crons`; protect cron routes with their configured secret.
- Notification deep-link payloads should contain small routing/context data only, not private content.

### MCP

- The MCP endpoint uses `requireAuth(request)` and passes authenticated `userId` into tools by closure.
- Never accept user id from MCP tool input.
- Keep transport as `WebStandardStreamableHTTPServerTransport` from `webStandardStreamableHttp.js`; do not replace it with the Node `StreamableHTTPServerTransport`.
- Product MCP tools belong under `src/lib/mcp/tools/` and are registered in `src/lib/mcp/server.ts`; keep `src/app/api/mcp/route.ts` as transport glue.
- Tool input schemas should use `zod` and validate ids, enums, and optional filters.
- Not-found and ownership failures should return `{ isError: true, content: [...] }` rather than leaking data.

### Object Storage

- User files and private media require authenticated API routes and ownership checks.
- Public assets may be served from `public/` or known public URLs only when they are intended to be visible to all users.
- Do not hardcode private uploads, personal photos, documents, addresses, phone numbers, or other PII into source files or locale JSON.

## UI, i18n, and CSS Rules

- `src/app/globals.css` must keep all `@import` lines at the top, before `@custom-variant`, `@theme`, `:root`, `@property`, `@keyframes`, and normal rules.
- Never append an `@import` later in `globals.css`.
- Do not use Tailwind v3 `@tailwind base/components/utilities` directives.
- Do not create `tailwind.config.ts` or `tailwind.config.js`.
- Load Google fonts with `next/font/google` in `src/app/layout.tsx`; do not use CSS `@import url(...)` for fonts.
- Keep CSS ownership local. Shared CSS should be limited to design tokens, base element defaults, reusable utilities, and truly cross-app primitives.
- Screen-specific layout, component-specific variants, modal/sheet styling, one-off animation details, and generated design CSS belong with the owning component or feature, not in shared/global styles.
- Prefer Tailwind utilities and token-backed component classes for product UI. Add shared CSS only when multiple unrelated features reuse the same primitive or when Tailwind cannot express the behavior cleanly.
- If shared/global CSS starts growing because of one feature, move that feature's styles back to its owning component or feature folder before adding more shared rules.
- Import shadcn/ui primitives from `@/components/ui/`.
- Use lucide-react for known icons and framer-motion for component animations when animation is needed.
- Keep product UI copy in locale files, not hardcoded JSX strings.
- Use shadcn/ui source primitives for standard controls when available, customized with the app's product tokens.
- Build custom components for domain-specific visuals and interactions.
- Mobile layouts need touch-friendly controls, no horizontal overflow, and safe-area-aware fixed elements.
- Desktop layouts should use desktop-appropriate navigation; do not ship mobile bottom tabs as the only desktop navigation.

## Product UI Quality Checklist

- Preserve the approved product hierarchy, copy, navigation behavior, form fields, CTA behavior, loading states, empty states, success states, and error states.
- Keep route-level pages reachable by direct URL; do not implement real app screens only as client-side selected state.
- Product navigation should work on mobile and desktop, with current-route affordances and accessible labels.
- Interactive controls should have visible disabled/loading/error states when the action can fail or take time.
- Forms should use labels, typed inputs, validation feedback, and submit/error handling that matches the product domain.
- Loading UI should use skeletons or stable placeholders for layout-sensitive content, not layout-shifting blank states.
- Empty states should be product-specific and actionable when an action is available.
- Error copy should be user-facing, localized, and should not leak secrets, stack traces, private ids, or provider internals.
- Avoid hiding core product features on small screens; adapt layout instead.
- Use real domain sample data when the app needs examples. Remove placeholder demo data before handoff.

## Data and Privacy Rules

- Treat Eazo apps as shareable by default. Anything committed to source, locale JSON, `public/`, or hardcoded URLs can become visible to all users.
- Do not hardcode private photos, user documents, journals, home addresses, phone numbers, access tokens, private API keys, or personal records.
- Private or user-generated media should go through authenticated API routes plus database/object-storage ownership checks.
- Shared/public content must be intentional and safe for all viewers.
- Third-party credentials belong in server env vars and API routes, not client components or locale files.
- Platform-managed Eazo env vars are already provisioned by Creator; do not ask users to configure them as third-party credentials.
- Database rows containing private user data should include an owner field and every query should filter by authenticated owner.
- Do not rely on frontend filtering to protect private data.

## Coding Rules

- Each URL maps to a real `src/app/**/page.tsx`.
- Write the page's screen UI directly in its `src/app/**/page.tsx` so the route renders as soon as the file is written. Do not force an extra "thin shell imports one feature component" indirection layer for a page that only one route uses.
- Only extract into `src/components/<feature>/` what is genuinely **shared/reused across routes** (the app shell, nav, and cross-page primitives) or a self-contained heavy widget. Group shared UI by feature rather than by generic type.
- Do not make a feature's `index.tsx` or top-level screen component the whole app. If one component would own multiple routes or major view states, split those states into separate feature components before adding more behavior.
- Feature entry files should compose smaller parts. Put substantial sheets/dialogs in their own `*-sheet.tsx` / `*-dialog.tsx`, feature-local browser lifecycle logic in `use-*.ts`, and pure calculations/data transforms in `src/lib/<feature>/*.ts`.
- Keep files focused. Split stateful, reused, or long UI sections into their own component files; tiny local helpers are fine when they keep code clearer.
- Keep single files small enough to review. Use these size limits as split signals, not reasons to create empty abstraction layers: page or screen file 300 lines, shared feature/component file 250 lines, utility or hook 150 lines, shared CSS 250 lines, API route handler 100 lines. A page under this signal may hold its own screen UI inline.
- When a file crosses its split signal because it owns multiple responsibilities, split by ownership before adding more code.
- Component files use `kebab-case.tsx`.
- Component exports use named `PascalCase` functions.
- Feature folders expose the top-level component through `index.tsx`.
- API helpers use `camelCase` functions in `src/lib/api/<resource>.ts` and re-export through `src/lib/api/index.ts`.
- Use `@/` path aliases; avoid relative `../../` chains.
- Keep shared state in `src/stores/` when state is shared across features; do not spread unrelated shared state through local `useState` copies.
- Keep large mock data, long animation variants, rich section markup, complex SVGs, canvas/image-processing logic, export formatting, and CSS-variable generation outside route files and feature entry files.
- Keep API route handlers focused: parse input, authenticate, call typed query/service helpers, return a response.
- Split files when they are hard to review or exceed the size signals above.

## Commands

```bash
bun install
bun run lint
bun run build
```

Database commands:

```bash
bun run db:generate
bun run db:migrate
```

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `EAZO_APP_ID` | Eazo app id and notification publish app id. |
| `EAZO_PRIVATE_KEY` | Session decryption, `requireAuth`, AI, and notification signing. |
| `DATABASE_URL` | PostgreSQL connection string when the app uses the database. |
| `NEXT_PUBLIC_APP_TITLE` | Product title consumed by `layout.tsx`. |
| `NEXT_PUBLIC_APP_DESCRIPTION` | Product description consumed by `layout.tsx`. |
| `CRON_SECRET` | Required only for protected scheduled routes. |

Platform-managed Eazo env vars are not user-supplied third-party credentials.

## Final Check

Before handing off generated app code:

- Provider chain, i18n files, `request()`, `requireAuth`, `UserSyncEffect`, and local `users` table still exist.
- Private data paths use authenticated `userId` scope.
- User-visible copy exists in both `en-US` and `zh-CN`.
- `globals.css` import ordering is valid.
- Page/component/API boundaries follow this guide.
- Demo todos, demo API routes, demo schema, demo migrations, and demo locale keys are gone unless the product explicitly is a todo app.
- Any required third-party integration reads credentials only from server-side env vars.
- `bun run lint` passes.
- `bun run build` passes.

Keep the template lean and add complexity only for concrete product requirements.
