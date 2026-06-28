import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { SiteShell } from "@/components/site/SiteShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChemVault Notif | ChemVault",
  description: "Notification and workflow communication infrastructure for the ChemVault ecosystem.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/assets/chemvault-icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/assets/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/assets/chemvault-apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SiteShell>{children}</SiteShell>
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}
