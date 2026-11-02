A minimal Next.js starter for building apps inside the [Eazo](https://eazo.ai) platform. Uses `@eazo/sdk` for web and Mobile authentication, server-side session verification, and profile hydration. Standalone development previews support mock users without platform login.

## Getting Started

Install dependencies with Bun:

```bash
bun install
```

If dependency installation stalls on this machine during `sharp` setup, use:

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 bun install
```

Then start the development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Development users

`bun run dev` automatically signs the standalone preview browser in as a test
user. Open `http://localhost:3000/?__dev_user=alice` or
`http://localhost:3000/?__dev_user=bob` to switch identities without registering
accounts. Aliases accept 1–32 lowercase letters, digits, `_` and `-`, starting
with a letter or digit. Each alias has a stable `__eazo_dev__<alias>` user ID;
the existing profile API upserts it into the App's users table.

Use a full browser navigation/reload when switching. `?__dev_user=none` clears
the session for an anonymous visit. Without a parameter, existing sessions are
preserved and a fresh browser defaults to `preview`. An explicit alias replaces
the current session. Normal tabs share localStorage; simultaneous-user tests
need isolated browser contexts.

`bun run dev:real` uses real login. Creator iframe and Mobile WebView always
keep host login. Mock identities access the configured App database, so use
development data; platform memory and real account entitlements require real
login. Mock authentication requires both development mode and
`EAZO_DEV_MOCK_AUTH=1`. Production builds reject mock sessions even if that flag
is set. No platform token, private key or browser automation is needed to
create a mock identity.

## Environment Variables

Copy `.env.example` to `.env` and fill in your private key:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `EAZO_PRIVATE_KEY` | Your Eazo developer private key (hex, 64 chars). Used server-side to decrypt the user session token. |

You can generate a keypair in the Eazo developer settings. Never expose the private key to the browser.

## Learn More

- [Eazo Documentation](https://docs.eazo.ai)
- [Next.js Documentation](https://nextjs.org/docs)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
