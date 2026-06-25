"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/NotificationBell";

const primaryLinks = [
  { href: "/", label: "Overview" },
  { href: "/notifications", label: "Notifications" },
  { href: "/conversations", label: "Messages" },
  { href: "/updates", label: "Updates" },
  { href: "/settings/notifications", label: "Preferences" },
];

const moreLinks = [
  { href: "/admin/broadcasts", label: "Broadcasts" },
  { href: "/admin/feature-updates", label: "Feature updates" },
  { href: "/admin/audit-logs", label: "Audit logs" },
  { href: "/admin/webhook-events", label: "Webhooks" },
  { href: "/admin/api-keys", label: "API keys" },
];

const footerGroups = [
  {
    title: "Workspace",
    links: [
      ["Notifications", "/notifications"],
      ["Messages", "/conversations"],
      ["Product updates", "/updates"],
      ["Preferences", "/settings/notifications"],
    ],
  },
  {
    title: "Admin",
    links: [
      ["Broadcasts", "/admin/broadcasts"],
      ["Feature updates", "/admin/feature-updates"],
      ["User segments", "/admin/user-segments"],
      ["Audit logs", "/admin/audit-logs"],
    ],
  },
  {
    title: "Services",
    links: [
      ["API keys", "/admin/api-keys"],
      ["Webhook events", "/admin/webhook-events"],
      ["User segments", "/admin/user-segments"],
    ],
  },
  {
    title: "Review",
    links: [
      ["Result review", "/notifications"],
      ["Project messages", "/conversations"],
      ["System settings", "/settings/notifications"],
    ],
  },
] satisfies Array<{
  title: string;
  links: Array<[string, string]>;
}>;

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
        <Link href="/" className="brand" aria-label="ChemVault Notification Center home">
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
            <strong>ChemVault Notify</strong>
            <small>notification command center</small>
          </span>
        </Link>

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
          <details className="nav-more">
            <summary>Admin</summary>
            <div className="nav-more-menu">
              {moreLinks.map((link) => (
                <Link key={link.href} href={link.href as Route}>
                  {link.label}
                </Link>
              ))}
            </div>
          </details>
        </nav>

        <div className="header-actions">
          <NotificationBell />
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
    <footer className="site-footer" aria-label="ChemVault Notification Center footer">
      <div className="footer-panel">
        <div className="footer-ambient" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="marketing-container footer-grid">
          <div className="footer-brand-block">
            <Link className="footer-brand" href="/">
              <span className="footer-brand-mark" aria-hidden="true">
                <Image
                  src="/assets/chemvault-logo-mark.png"
                  alt=""
                  width={34}
                  height={34}
                />
              </span>
              <span>
                <strong>ChemVault Notify</strong>
                <small>Unified notification infrastructure</small>
              </span>
            </Link>
            <p>
              Central notification, messaging, webhook, audit, and workflow event infrastructure
              for ChemVault scientific workspaces.
            </p>
            <div className="footer-social-row" aria-label="Quick footer actions">
              <Link className="footer-social" href="/notifications">
                Notification center
              </Link>
              <Link className="footer-social" href="/conversations">
                Project messages
              </Link>
              <Link className="footer-social" href={"/updates" as Route}>
                Product updates
              </Link>
              <Link className="footer-social" href="/admin/webhook-events">
                Webhook events
              </Link>
            </div>
          </div>

          <div className="footer-link-groups">
            {footerGroups.map((group) => (
              <FooterGroup key={group.title} title={group.title} links={group.links} />
            ))}
          </div>
        </div>
        <div className="marketing-container footer-bottom">
          <p>© 2026 ChemVault. All rights reserved.</p>
          <div className="footer-bottom-meta">
            <p>Authenticated workspace data stays inside ChemVault-controlled surfaces.</p>
            <span className="footer-version">Notification Center</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterGroup({ title, links }: { title: string; links: Array<[string, string]> }) {
  return (
    <div className="footer-column">
      <span className="footer-heading">{title}</span>
      {links.map(([label, href]) => (
        <Link key={href} href={href as Route}>
          {label}
        </Link>
      ))}
    </div>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
