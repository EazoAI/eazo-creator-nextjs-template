import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { EazoProvider } from "@eazo/sdk/react";
import { cn } from "@/utils/utils";
import { Toaster } from "@/components/ui/sonner";
import { UserSyncEffect } from "@/components/user-profile/user-sync-effect";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Eazo Developer Home",
  description: "Developer onboarding, secure session flow, and backend verification examples.",
};

// Mobile-first viewport.
// - viewportFit: "cover" lets the page render edge-to-edge under the native
//   status bar / home indicator in plain mobile Safari and inside Eazo Mobile.
// - We intentionally do NOT set maximumScale / userScalable=false; pinch-zoom is
//   kept available for accessibility. The "tap input → page zooms in" behaviour
//   is fixed at the CSS layer (globals.css) by enforcing font-size >= 16px on
//   form controls below the sm breakpoint.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full antialiased", "font-sans", geist.variable)}>
      <body className="min-h-full flex flex-col">
        <EazoProvider>
          <UserSyncEffect />
          {children}
          <Toaster />
        </EazoProvider>
      </body>
    </html>
  );
}
