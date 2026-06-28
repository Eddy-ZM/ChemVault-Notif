import Link from "next/link";
import type { Route } from "next";
import {
  ArrowRight,
  BellRing,
  CheckCircle2,
  Clock3,
  Inbox,
  MessageSquareText,
  Settings2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { LatestUpdateWidget } from "@/components/feature-updates/LatestUpdateWidget";
import { NotificationBell } from "@/components/notifications/NotificationBell";

const notificationChannels = [
  {
    title: "Notifications",
    description: "Priority notices and workflow activity in one calm inbox.",
    href: "/notifications",
    icon: Inbox,
  },
  {
    title: "Messages",
    description: "Project conversations remain close to the work they support.",
    href: "/conversations",
    icon: MessageSquareText,
  },
  {
    title: "Preferences",
    description: "Choose how ChemVault should reach you across channels.",
    href: "/settings/notifications",
    icon: Settings2,
  },
];

const operatingNotes = [
  { label: "Account aware", value: "User Center" },
  { label: "Delivery scope", value: "ChemVault services" },
  { label: "Signal state", value: "Ready" },
];

export default function Home() {
  return (
    <div className="notify-home">
      <section className="marketing-container notify-hero">
        <div className="notify-hero-copy">
          <span className="notify-kicker">
            <Sparkles className="size-3.5" aria-hidden="true" />
            notify.chemvault.science
          </span>
          <h1>ChemVault Notifications</h1>
          <p>
            A focused notification station for ChemVault account notices,
            project messages, product updates, and delivery preferences.
          </p>
          <div className="notify-actions">
            <Button asChild>
              <Link href="/notifications">
                Open notification center
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={"/updates" as Route}>View updates</Link>
            </Button>
          </div>
        </div>

        <div className="notify-console" aria-label="Notification station preview">
          <div className="notify-console-header">
            <div>
              <span>Notification station</span>
              <strong>ChemVault</strong>
            </div>
            <NotificationBell />
          </div>
          <div className="notify-console-list">
            <div className="notify-console-item is-current">
              <BellRing className="size-4" aria-hidden="true" />
              <div>
                <strong>Priority notices</strong>
                <span>New activity appears here first.</span>
              </div>
              <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
            </div>
            <div className="notify-console-item">
              <MessageSquareText className="size-4" aria-hidden="true" />
              <div>
                <strong>Project messages</strong>
                <span>Conversations stay attached to ChemVault work.</span>
              </div>
              <Clock3 className="size-4 text-slate-400" aria-hidden="true" />
            </div>
            <div className="notify-console-item">
              <ShieldCheck className="size-4" aria-hidden="true" />
              <div>
                <strong>Account notices</strong>
                <span>Security and preference changes remain visible.</span>
              </div>
              <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
            </div>
          </div>
          <div className="notify-operating-strip">
            {operatingNotes.map((note) => (
              <div key={note.label}>
                <span>{note.label}</span>
                <strong>{note.value}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-container notify-workspace" aria-label="Notification workspace">
        <div className="notify-section-heading">
          <span>Notification workspace</span>
          <h2>Essential surfaces only.</h2>
        </div>
        <div className="notify-channel-grid">
          {notificationChannels.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.title} href={item.href as Route} className="notify-channel-card">
                <span className="notify-card-icon" aria-hidden="true">
                  <Icon className="size-4" />
                </span>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
                <span className="notify-card-link">
                  Open
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
        <div className="notify-update-panel">
          <LatestUpdateWidget />
        </div>
      </section>
    </div>
  );
}
