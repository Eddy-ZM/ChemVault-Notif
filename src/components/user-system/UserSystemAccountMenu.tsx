"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { LogIn, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  fetchCurrentUser,
  logoutCurrentUser,
  type CurrentUserResponse,
} from "@/lib/user-system/client";

export function UserSystemAccountMenu() {
  const [session, setSession] = useState<CurrentUserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    fetchCurrentUser()
      .then((result) => {
        if (mounted) {
          setSession(result);
        }
      })
      .catch(() => {
        if (mounted) {
          setSession(null);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const initials = useMemo(() => {
    const user = session?.user;
    const source = user?.name || user?.email || "CV";
    return source
      .split(/[ @._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [session?.user]);

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <UserRound className="size-4" aria-hidden="true" />
      </Button>
    );
  }

  if (!session?.user) {
    return (
      <Button asChild variant="outline" size="sm">
        <a href={session?.links.login ?? "https://user.chemvault.science/login"}>
          <LogIn className="size-4" aria-hidden="true" />
          Sign in
        </a>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 px-2">
          <Avatar className="size-7">
            <AvatarImage src={session.user.avatarUrl ?? undefined} alt="" />
            <AvatarFallback>{initials || "CV"}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-28 truncate text-sm md:inline">
            {session.user.name || session.user.email}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <span className="block truncate">{session.user.name || "ChemVault user"}</span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {session.user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={session.links.profile}>
            <UserRound className="size-4" aria-hidden="true" />
            Profile settings
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={session.links.dashboard}>
            <ShieldCheck className="size-4" aria-hidden="true" />
            User Center
          </a>
        </DropdownMenuItem>
        {session.isAdmin ? (
          <DropdownMenuItem asChild>
            <Link href={"/admin" as Route}>
              <ShieldCheck className="size-4" aria-hidden="true" />
              Admin tools
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            void logoutCurrentUser().finally(() => {
              window.location.reload();
            });
          }}
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
