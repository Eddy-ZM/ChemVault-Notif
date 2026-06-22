import { createClient } from "@supabase/supabase-js";
import { getRequiredEnv } from "@/lib/env";
import type { Database } from "./database.types";

export function createSupabaseAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("Supabase admin client must only be used on the server.");
  }

  return createClient<Database>(
    getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
