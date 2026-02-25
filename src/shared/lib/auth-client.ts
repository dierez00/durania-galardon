"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isAppRole, type AppRole } from "@/shared/lib/auth";

type TenantResolveApiResponse = {
  ok: boolean;
  data?: {
    tenant: {
      tenantSlug: string;
      source: string;
    } | null;
  };
};

export interface ResolveClientRoleResult {
  role: AppRole | null;
  tenantId?: string;
  tenantSlug?: string;
  code?: "TENANT_NOT_FOUND" | "ROLE_NOT_FOUND" | "ROLE_MULTI_ASSIGNED";
}

async function resolveClientTenant(supabase: SupabaseClient) {
  const tenantResponse = await fetch("/api/tenant/resolve", {
    method: "GET",
    cache: "no-store",
  });
  const tenantBody = (await tenantResponse.json()) as TenantResolveApiResponse;
  const tenantSlug = tenantBody.data?.tenant?.tenantSlug;
  if (!tenantSlug) {
    return null;
  }

  const tenantResult = await supabase
    .from("tenants")
    .select("id,slug,status")
    .eq("slug", tenantSlug)
    .eq("status", "active")
    .maybeSingle();

  if (tenantResult.error || !tenantResult.data) {
    return null;
  }

  return tenantResult.data;
}

type TenantRoleRow = {
  tenant_role:
    | {
        key: string;
      }[]
    | {
        key: string;
      }
    | null;
};

export async function resolveClientRole(
  supabase: SupabaseClient,
  userId: string
): Promise<ResolveClientRoleResult> {
  const tenant = await resolveClientTenant(supabase);
  if (!tenant) {
    return { role: null, code: "TENANT_NOT_FOUND" };
  }

  const membershipResult = await supabase
    .from("tenant_memberships")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (membershipResult.error || !membershipResult.data) {
    return {
      role: null,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      code: "ROLE_NOT_FOUND",
    };
  }

  const rolesResult = await supabase
    .from("tenant_user_roles")
    .select("tenant_role:tenant_roles(key)")
    .eq("membership_id", membershipResult.data.id);

  if (rolesResult.error) {
    return {
      role: null,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      code: "ROLE_NOT_FOUND",
    };
  }

  const rows = (rolesResult.data ?? []) as unknown as TenantRoleRow[];
  const roles = rows
    .flatMap((item) => {
      if (!item.tenant_role) {
        return [];
      }

      if (Array.isArray(item.tenant_role)) {
        return item.tenant_role.map((role) => role.key);
      }

      return [item.tenant_role.key];
    })
    .filter((value): value is string => Boolean(value))
    .filter(isAppRole);

  if (roles.length === 1) {
    return {
      role: roles[0],
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
    };
  }

  if (roles.length > 1) {
    return {
      role: null,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      code: "ROLE_MULTI_ASSIGNED",
    };
  }

  return {
    role: null,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    code: "ROLE_NOT_FOUND",
  };
}
