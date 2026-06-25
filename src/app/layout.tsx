import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { SiteShell } from "@/components/site/SiteShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChemVault Notification Center",
  description: "Unified notification center for the ChemVault ecosystem.",
  icons: {
    icon: "/assets/chemvault-logo-mark.png",
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
