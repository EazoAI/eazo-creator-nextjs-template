# Agent Guide

This repository is a Bun-first, minimal Next.js starter for quickly creating new company projects.

## Stack

- Next.js 16 with App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Bun as the package manager and default runtime for local scripts

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

## Structure

- `src/app`: routes, layout, global styles
- `public`: static assets
- `next.config.ts`: Next.js config
- `eslint.config.mjs`: lint rules

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
