import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/utils/utils";
import { AuthInit } from "@/components/auth/auth-init";
import { LoginModal } from "@/components/auth/login-modal";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Eazo Developer Home",
  description: "Developer onboarding, secure session flow, and backend verification examples.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("h-full antialiased", "font-sans", geist.variable)}>
      <body className="min-h-full flex flex-col">
        {children}
        <AuthInit />
        <LoginModal />
        <Toaster />
      </body>
    </html>
  );
}
