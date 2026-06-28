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
  { href: "/", label: "Center" },
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

const ecosystemLinks = [
  { href: "https://chemvault.science", label: "Home" },
  { href: "https://chemvault.science/pages/research.html", label: "Research" },
  { href: "https://chemvault.science/pages/platform.html", label: "Platform" },
  { href: "https://chemvault.science/pages/projects.html", label: "Projects" },
  { href: "https://chemvault.science/pages/search.html", label: "Compounds" },
  { href: "https://chemvault.science/pages/contact.html", label: "Contact" },
];

const footerGroups = [
  {
    title: "Platform",
    links: [
      ["Research", "https://chemvault.science/pages/research.html"],
      ["Platform", "https://chemvault.science/pages/platform.html"],
      ["Projects", "https://chemvault.science/pages/projects.html"],
      ["Notes", "https://chemvault.science/pages/notes.html"],
      ["About", "https://chemvault.science/pages/about.html"],
    ],
  },
  {
    title: "Tools",
    links: [
      ["Compound Search", "https://chemvault.science/pages/search.html"],
      ["Research Workbench", "https://chemvault.science/pages/workbench.html"],
      ["Framework App", "https://chemvault.science/pages/app.html"],
      ["Reagents", "https://chemvault.science/pages/reagents.html"],
      ["Materials", "https://chemvault.science/pages/materials.html"],
      ["Atlas", "https://chemvault.science/pages/atlas.html"],
    ],
  },
  {
    title: "Resources",
    links: [
      ["Library", "https://chemvault.science/pages/library.html"],
      ["Methods", "https://chemvault.science/pages/methods.html"],
      ["Spectroscopy", "https://chemvault.science/pages/spectroscopy.html"],
      ["Dossiers", "https://chemvault.science/pages/dossiers.html"],
      ["Public data", "https://chemvault.science/pages/public-data.html"],
      ["Sitemap", "https://chemvault.science/pages/sitemap.html"],
    ],
  },
  {
    title: "Notify",
    links: [
      ["Notification Center", "/notifications"],
      ["Project Messages", "/conversations"],
      ["Product Updates", "/updates"],
      ["Preferences", "/settings/notifications"],
      ["API keys", "/admin/api-keys"],
      ["Webhook events", "/admin/webhook-events"],
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
            <small>scientific infrastructure</small>
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
          <details className="nav-more">
            <summary>Ecosystem</summary>
            <div className="nav-more-menu">
              {ecosystemLinks.map((link) => (
                <a key={link.href} href={link.href}>
                  {link.label}
                </a>
              ))}
            </div>
          </details>
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
      <div className="footer-panel">
        <div className="footer-ambient" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="marketing-container footer-grid">
          <div className="footer-brand-block">
            <a className="footer-brand" href="https://chemvault.science">
              <span className="footer-brand-mark" aria-hidden="true">
                <Image
                  src="/assets/chemvault-logo-mark.png"
                  alt=""
                  width={34}
                  height={34}
                />
              </span>
              <span>
                <strong>ChemVault</strong>
                <small>Scientific knowledge infrastructure</small>
              </span>
            </a>
            <p>
              An academic technology initiative for chemistry, scientific data extraction,
              research intelligence and AI-assisted knowledge systems. Verify primary data
              before applying chemical information.
            </p>
            <div className="footer-social-row" aria-label="Quick footer actions">
              <a className="footer-social" href="https://chemvault.science/pages/search.html">
                Compound Search
              </a>
              <a className="footer-social" href="https://chemvault.science/pages/platform.html">
                Platform
              </a>
              <a className="footer-social" href="https://chemvault.science/pages/public-data.html">
                Public Data
              </a>
              <Link className="footer-social" href="/notifications">
                Notification Center
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
            <p>Research-oriented reference and workflow infrastructure for ChemVault services.</p>
            <span className="footer-version">ChemVault Notif</span>
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
      {links.map(([label, href]) =>
        isExternal(href) ? (
          <a key={href} href={href}>
            {label}
          </a>
        ) : (
          <Link key={href} href={href as Route}>
            {label}
          </Link>
        )
      )}
    </div>
  );
}

function isExternal(href: string) {
  return href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:");
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
