"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getPublicSupabaseEnv } from "@/lib/env";
import type { Database } from "./database.types";

export function createSupabaseBrowserClient() {
  const { url, anonKey } = getPublicSupabaseEnv();

  return createBrowserClient<Database>(url, anonKey);
}
