import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentChemVaultUser } from "@/lib/user-system/server";
import type { AuthenticatedChemVaultUser } from "@/types/user-system";

export async function getAuthenticatedSupabase() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!error && user) {
    return {
      supabase,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name,
        avatarUrl: user.user_metadata?.avatar_url ?? null,
        role: user.app_metadata?.role,
        systemRole: user.app_metadata?.system_role,
        source: "supabase",
      } satisfies AuthenticatedChemVaultUser,
    };
  }

  return {
    supabase,
    user: await getCurrentChemVaultUser(),
  };
}
