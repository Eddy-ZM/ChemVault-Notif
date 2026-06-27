export type ChemVaultUserRole = "free" | "pro" | "admin" | string;
export type ChemVaultSystemRole =
  | "user"
  | "staff"
  | "service_admin"
  | "admin"
  | "super_admin"
  | "owner"
  | string;

export interface ChemVaultUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  institution: string | null;
  fieldOfInterest: string | null;
  bio: string | null;
  website: string | null;
  role: ChemVaultUserRole;
  systemRole: ChemVaultSystemRole;
  source: string;
  globalStatus: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  permissions?: string[];
  services?: string[];
  pages?: string[];
}

export interface UserSystemAccessDecision {
  allowed: boolean;
  reason: string;
  user?: Pick<ChemVaultUser, "id" | "email" | "systemRole">;
}

export interface AuthenticatedChemVaultUser {
  id: string;
  email?: string;
  name?: string;
  avatarUrl?: string | null;
  role?: string;
  systemRole?: string;
  permissions?: string[];
  services?: string[];
  pages?: string[];
  source: "supabase" | "chemvault_user";
}
