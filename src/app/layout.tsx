import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
