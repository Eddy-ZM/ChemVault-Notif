"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { UserSystemAccountMenu } from "@/components/user-system/UserSystemAccountMenu";

const primaryLinks = [
  { href: "/", label: "Home" },
  { href: "/notifications", label: "Notifications" },
  { href: "/conversations", label: "Messages" },
  { href: "/updates", label: "Updates" },
  { href: "/settings/notifications", label: "Preferences" },
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="site-main">{children}</div>
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="site-header">
      <div className="marketing-container nav-shell">
        <a href="https://chemvault.science" className="brand" aria-label="ChemVault home">
          <span className="brand-mark" aria-hidden="true">
            <Image
              src="/assets/chemvault-logo-mark.png"
              alt=""
              width={30}
              height={30}
              priority
            />
          </span>
          <span>
            <strong>ChemVault</strong>
            <small>Notification Station</small>
          </span>
        </a>

        <nav className="site-nav" aria-label="Main navigation">
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href as Route}
              className={cn(isActive(pathname, link.href) && "is-active")}
            >
              {link.label}
            </Link>
          ))}
          <a href="https://docs.chemvault.science/manual/notifications/" target="_blank" rel="noopener noreferrer">
            Docs
          </a>
        </nav>

        <div className="header-actions">
          <NotificationBell />
          <UserSystemAccountMenu />
          <Button asChild size="sm" className="site-action-button">
            <Link href={"/notifications" as Route}>
              Open center
              <ArrowRight data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer" aria-label="ChemVault footer">
      <div className="marketing-container site-footer-inner">
        <div className="site-footer-primary">
          <a className="site-footer-brand" href="https://chemvault.science">
            <span className="site-footer-brand-mark" aria-hidden="true">
              <Image
                src="/assets/chemvault-logo-mark.png"
                alt=""
                width={34}
                height={34}
              />
            </span>
            <span>
              <strong>ChemVault Notification Station</strong>
              <small>notify.chemvault.science</small>
            </span>
          </a>
          <p>Focused notices, messages, updates, and delivery preferences for ChemVault accounts.</p>
        </div>

        <nav className="site-footer-links" aria-label="ChemVault notification links">
          <Link href="/notifications">Notifications</Link>
          <Link href="/updates">Updates</Link>
          <Link href="/settings/notifications">Preferences</Link>
          <a href="https://docs.chemvault.science/manual/notifications/" target="_blank" rel="noopener noreferrer">Docs</a>
          <a href="https://user.chemvault.science">User Center</a>
        </nav>
      </div>
      <div className="marketing-container site-footer-base">
        <span>Copyright {new Date().getFullYear()} ChemVault</span>
        <nav aria-label="ChemVault legal links">
          <a href="https://user.chemvault.science/terms">Terms</a>
          <a href="https://user.chemvault.science/privacy">Privacy</a>
        </nav>
      </div>
    </footer>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
