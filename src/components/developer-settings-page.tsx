"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const AVATAR_URL =
  "https://fellou.s3.us-west-1.amazonaws.com/uploads/avatars/6978d26c19aec31529ce989e/11459901-1a61-4812-bbec-ad214cd6663d.png";

const sessionBridgeCode = `const CHANNEL = 'eazo:open-bridge'
const VERSION = 1
const pendingRequests = new Map()

function requestBridgeApi(method, params = {}) {
  const requestId = crypto.randomUUID()
  return new Promise((resolve, reject) => {
    pendingRequests.set(requestId, { resolve, reject })
    window.parent.postMessage(
      { channel: CHANNEL, type: 'request', requestId, version: VERSION, method, params },
      '*'
    )
  })
}

window.addEventListener('message', (event) => {
  const msg = event.data
  if (!msg || msg.channel !== CHANNEL || msg.type !== 'response') return
  const task = pendingRequests.get(msg.requestId)
  if (!task) return
  pendingRequests.delete(msg.requestId)
  msg.ok ? task.resolve(msg.result) : task.reject(msg.error)
})

// Call this in your app to get the encrypted session token
async function fetchSessionToken() {
  const payload = await requestBridgeApi('session.getToken')
  // payload: { encryptedData, encryptedKey, algorithm, iv, authTag }
  // Send payload to YOUR backend route — never decrypt in the browser
  await fetch('/api/verify-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}`;

const nextjsServerCode = `import { NextResponse } from 'next/server'
import { decrypt } from '@eazo/node-sdk'

export async function POST(request: Request) {
  const payload = await request.json()

  const result = decrypt({
    ...payload,
    privateKey: process.env.EAZO_PRIVATE_KEY!,
  })

  return NextResponse.json({
    ok: true,
    user: result.data,
  })
}`;

const howItWorksSteps = [
  "You generate a keypair here. The public key is stored by the platform; you keep the private key.",
  "Your app (running inside an Eazo iframe) calls the bridge API session.getToken via postMessage. The host page injects the appId automatically — your iframe cannot override it.",
  "The platform encrypts the user's info with your public key using ECC secp256k1 + AES-256-GCM and returns an encrypted payload.",
  "The user sends this payload to your backend. You decrypt it with your private key to read their userId, email, nickname, and more.",
];

type CopyButtonProps = {
  code: string;
  label: string;
};

function CopyButton({ code, label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;

    const timer = window.setTimeout(() => {
      setCopied(false);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-stone-400 transition hover:text-stone-200"
    >
      <CopyIcon className="size-3.5" />
      {copied ? "Copied" : label}
    </button>
  );
}

type CodeBlockProps = {
  title: string;
  code: string;
};

function CodeBlock({ title, code }: CodeBlockProps) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-stone-900">
      <div className="flex items-center justify-between border-b border-stone-700 px-4 py-2">
        <span className="text-xs text-stone-400">{title}</span>
        <CopyButton code={code} label="Copy" />
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-stone-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

type PanelProps = {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
};

function Panel({ icon, title, children, action }: PanelProps) {
  return (
    <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-base font-semibold text-stone-900">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DeveloperSettingsPage() {
  return (
    <div className="fixed inset-0 overflow-y-auto bg-stone-50">
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <button
          type="button"
          className="flex size-7 items-center justify-center rounded-full text-xs font-medium text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
        >
          中
        </button>
        <div className="relative">
          <button
            type="button"
            className="flex size-7 items-center justify-center rounded-full ring-2 ring-transparent transition hover:ring-[#EE5C2A]/30 focus:outline-none"
          >
            <Image
              alt="User avatar"
              className="size-7 rounded-full object-cover"
              src={AVATAR_URL}
              width={28}
              height={28}
            />
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pb-24 pt-16">
        <header className="mb-8 flex flex-col items-center">
          <div className="mb-2 inline-flex items-center gap-2">
            <div className="size-2 rounded-full bg-[#EE5C2A]" />
            <span className="text-3xl font-semibold tracking-tight text-stone-900">
              Eazo
            </span>
          </div>
          <p className="max-w-lg text-center text-sm leading-6 text-stone-500">
            A clean starter page for developer-facing onboarding, secure session
            token flow, and backend verification examples.
          </p>
        </header>

        <Panel icon={<KeyRoundIcon className="size-4 text-[#EE5C2A]" />} title="Developer Keys">
          <div className="space-y-4">
            <p className="text-sm text-stone-500">
              You haven&apos;t generated a developer keypair yet. Generate one to
              enable encrypted user info access from your apps.
            </p>
            <button
              type="button"
              className="flex h-10 items-center gap-2 rounded-lg bg-[#EE5C2A] px-4 text-sm font-medium text-white transition hover:bg-[#d9511f] disabled:opacity-40"
            >
              <KeyRoundIcon className="size-4" />
              Generate Key Pair
            </button>
          </div>
        </Panel>

        <Panel icon={<ShieldCheckIcon className="size-4 text-[#EE5C2A]" />} title="How It Works">
          <p className="mb-4 text-sm leading-relaxed text-stone-600">
            Eazo uses a <strong>hybrid encryption scheme</strong> (digital
            envelope) to securely deliver end-user identity to your app:
          </p>
          <ol className="space-y-2 text-sm text-stone-600">
            {howItWorksSteps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#EE5C2A]/10 text-[11px] font-bold text-[#EE5C2A]">
                  {index + 1}
                </span>
                <span>{renderStepText(step)}</span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel
          icon={<KeyRoundIcon className="size-4 text-[#EE5C2A]" />}
          title="Get User Session Token"
        >
          <p className="mb-5 text-sm leading-relaxed text-stone-600">
            Your app runs inside an Eazo iframe. To get the current user&apos;s
            encrypted session token, call the bridge API via{" "}
            <InlineCode>postMessage</InlineCode> and forward the encrypted
            payload to your backend.
          </p>
          <CodeBlock title="JavaScript" code={sessionBridgeCode} />
          <div className="mt-4 rounded-lg border border-stone-100 bg-stone-50 px-4 py-3">
            <p className="text-xs font-medium text-stone-600">
              Then send to your backend
            </p>
            <p className="mt-0.5 text-xs text-stone-400">
              Do not decrypt in the browser. Forward the encrypted payload to
              your own backend server for verification and decryption.
            </p>
          </div>
        </Panel>

        <Panel
          icon={<CodeXmlIcon className="size-4 text-[#EE5C2A]" />}
          title="Verify In Next.js Route Handler"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <ExternalLink
                href="https://github.com/EazoAI/eazo-hackathon-demo"
                label="Example Project"
              />
              <ExternalLink
                href="https://github.com/EazoAI/eazo-sdk"
                label="View SDK on GitHub"
              />
            </div>
          }
        >
          <p className="mb-4 text-sm text-stone-500">
            For this template, install the SDK with Bun:{" "}
            <InlineCode>bun add @eazo/node-sdk</InlineCode>
          </p>
          <p className="mb-4 text-sm text-stone-500">
            Put this in{" "}
            <InlineCode>src/app/api/verify-user/route.ts</InlineCode> to decrypt
            the payload on the server.
          </p>
          <CodeBlock title="Next.js + Bun" code={nextjsServerCode} />

          <p className="mt-4 text-xs text-stone-400">
            The decrypted payload contains: <InlineCode>userId</InlineCode>,{" "}
            <InlineCode>email</InlineCode>, <InlineCode>nickname</InlineCode>,{" "}
            <InlineCode>avatarUrl</InlineCode>, <InlineCode>lang</InlineCode>,{" "}
            <InlineCode>region</InlineCode>, and{" "}
            <InlineCode>createdAt</InlineCode>.
          </p>
        </Panel>
      </div>
    </div>
  );
}

function renderStepText(step: string) {
  return step
    .split(/(`[^`]+`)/g)
    .filter(Boolean)
    .map((part, index) =>
      part.startsWith("`") && part.endsWith("`") ? (
        <InlineCode key={`${part}-${index}`}>{part.slice(1, -1)}</InlineCode>
      ) : (
        <span key={`${part}-${index}`}>{part}</span>
      )
    );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-stone-100 px-1 py-0.5 text-xs text-stone-700">
      {children}
    </code>
  );
}

function ExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:border-stone-300 hover:bg-stone-50"
    >
      <ExternalLinkIcon className="size-3.5" />
      {label}
    </a>
  );
}

function Icon({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function KeyRoundIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4Z" />
      <circle cx="16.5" cy="7.5" r=".5" fill="currentColor" />
    </Icon>
  );
}

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  );
}

function CodeXmlIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="m18 16 4-4-4-4" />
      <path d="m6 8-4 4 4 4" />
      <path d="m14.5 4-5 16" />
    </Icon>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </Icon>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </Icon>
  );
}
