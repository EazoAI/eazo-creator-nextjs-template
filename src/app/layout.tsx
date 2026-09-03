import type { Metadata, Viewport } from "next";
import "./globals.css";
import Script from "next/script";
import { Geist } from "next/font/google";
import { EazoProvider } from "@eazo/sdk/react";
import { cn } from "@/utils/utils";
import { Toaster } from "@/components/ui/sonner";
import { UserSyncEffect } from "@/components/user-profile/user-sync-effect";
import { I18nProvider } from "@/components/i18n/i18n-provider";
import { LocaleSyncEffect } from "@/components/i18n/locale-sync-effect";
import { PreviewInspector } from "@/components/eazo/preview-inspector";
import { getServerLocale } from "@/lib/i18n/server-preference";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const SITE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : undefined;

// The platform stamps the real product title/description into .env at scaffold
// time (NEXT_PUBLIC_APP_TITLE / NEXT_PUBLIC_APP_DESCRIPTION). These drive the
// app's <title> / meta description. Fall back to a generic default when unset
// (e.g. local dev before any scaffold values are written).
const SITE_TITLE = process.env.NEXT_PUBLIC_APP_TITLE?.trim() || "Eazo App";
const SITE_DESCRIPTION =
  process.env.NEXT_PUBLIC_APP_DESCRIPTION?.trim() || "An app build by eazo.ai";

// Point-select bridge for the Creator Canvas. The template always mounts the
// bridge; it is self-guarding and stays completely inert unless the app is
// running inside the Creator iframe (`window.parent !== window`) and the parent
// arms it, so it has zero runtime cost in published/production builds.

// Eazo web→app handoff branding is now delivered by the hosted, framework-
// agnostic drop-in script (loaded below via next/script) instead of being
// rendered by `@eazo/sdk`. The script reads the app id from the
// `data-eazo-app-id` attribute we stamp here from `EAZO_APP_ID`. It is
// self-guarding: no double mount, and it no-ops inside the Eazo Mobile
// WebView and embedded iframes, so it only paints the top/bottom banners on
// plain web. We only render the tag when an app id is present.
const EAZO_APP_ID = process.env.EAZO_APP_ID?.trim();
const EAZO_BRAND_BANNER_SRC =
  "https://cdn.eazo.ai/branding/eazo-brand-banner.js";

export const metadata: Metadata = {
  ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  icons: {
    icon: "https://eazo.ai/favicon.ico",
  },
  openGraph: {
    type: "website",
    siteName: "Eazo",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn("h-full antialiased", "font-sans", geist.variable)}
    >
      <body
        className="h-full flex flex-col"
        data-eazo-preview-inspector-runtime=""
      >
        <I18nProvider>
          <EazoProvider>
            <LocaleSyncEffect />
            <UserSyncEffect />
            {children}
            <Toaster />
            <PreviewInspector />
          </EazoProvider>
        </I18nProvider>
        {EAZO_APP_ID && (
          <Script
            src={EAZO_BRAND_BANNER_SRC}
            strategy="afterInteractive"
            data-eazo-app-id={EAZO_APP_ID}
          />
        )}
      </body>
    </html>
  );
}
