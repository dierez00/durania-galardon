"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import { isAppRole, isPermissionKey, type AppRole, type PermissionKey } from "@/shared/lib/auth";

export interface ResolveClientRoleResult {
  role: AppRole | null;
  tenantId?: string;
  tenantSlug?: string;
  permissions?: PermissionKey[];
  panelType?: "government" | "producer" | "mvz";
  code?: "UNAUTHORIZED" | "ROLE_NOT_FOUND" | "TENANT_NOT_FOUND";
}

interface AuthMeResponse {
  ok: boolean;
  data?: {
    user?: {
      role?: string;
    };
    tenant?: {
      id?: string;
      slug?: string;
    };
    panelType?: "government" | "producer" | "mvz";
    permissions?: string[];
  };
  error?: {
    code?: string;
  };
}

export async function resolveClientRole(
  supabase: SupabaseClient,
  _userId: string
): Promise<ResolveClientRoleResult> {
  const sessionResult = await supabase.auth.getSession();
  const accessToken = sessionResult.data.session?.access_token;

  if (!accessToken) {
    return { role: null, code: "UNAUTHORIZED" };
  }

  const response = await fetch("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const body = (await response.json()) as AuthMeResponse;
  if (!response.ok || !body.ok || !body.data?.user?.role || !isAppRole(body.data.user.role)) {
    return {
      role: null,
      tenantId: body.data?.tenant?.id,
      tenantSlug: body.data?.tenant?.slug,
      code: (body.error?.code as ResolveClientRoleResult["code"]) ?? "ROLE_NOT_FOUND",
    };
  }

  const permissions = (body.data.permissions ?? []).filter(isPermissionKey);

  return {
    role: body.data.user.role,
    tenantId: body.data.tenant?.id,
    tenantSlug: body.data.tenant?.slug,
    panelType: body.data.panelType,
    permissions,
  };
}
