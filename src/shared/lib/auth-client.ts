"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isAppRole, type AppRole } from "@/shared/lib/auth";

type RoleSelectRow = {
  role:
    | {
        key: string;
      }[]
    | {
        key: string;
      }
    | null;
};

export interface ResolveClientRoleResult {
  role: AppRole | null;
  code?: "ROLE_NOT_FOUND" | "ROLE_MULTI_ASSIGNED";
}

export async function resolveClientRole(
  supabase: SupabaseClient,
  userId: string
): Promise<ResolveClientRoleResult> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role:roles(key)")
    .eq("user_id", userId);

  if (error) {
    return { role: null, code: "ROLE_NOT_FOUND" };
  }

  const rows = (data ?? []) as unknown as RoleSelectRow[];
  const roles = rows
    .flatMap((item) => {
      if (!item.role) {
        return [];
      }

      if (Array.isArray(item.role)) {
        return item.role.map((role) => role.key);
      }

      return [item.role.key];
    })
    .filter((value): value is string => Boolean(value))
    .filter(isAppRole);

  if (roles.length === 1) {
    return { role: roles[0] };
  }

  if (roles.length > 1) {
    return { role: null, code: "ROLE_MULTI_ASSIGNED" };
  }

  return { role: null, code: "ROLE_NOT_FOUND" };
}
