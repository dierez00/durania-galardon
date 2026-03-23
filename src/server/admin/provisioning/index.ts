import {
  deleteAuthUser,
  inviteAuthUserByEmail,
} from "@/server/auth/provisioning";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toSlugBase(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

  return normalized || "tenant";
}

function buildSlugCandidates(fullName: string, email: string): string[] {
  const nameBase = toSlugBase(fullName);
  const emailBase = toSlugBase(email.split("@")[0] ?? "tenant");
  const now = Date.now().toString(36);

  return [
    `${nameBase}-${now}`,
    `${emailBase}-${now}`,
    `${nameBase}-${Math.random().toString(36).slice(2, 8)}`,
    `${emailBase}-${Math.random().toString(36).slice(2, 8)}`,
  ];
}

export function generateTemporaryPassword(length = 14): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const values = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(values)
    .map((value) => chars[value % chars.length])
    .join("");
}

export async function waitForProfile(userId: string): Promise<boolean> {
  const supabaseAdmin = getSupabaseProvisioningClient();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const profileResult = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!profileResult.error && profileResult.data) {
      return true;
    }

    await sleep(200);
  }

  return false;
}

export async function createTenantWithUniqueSlug(input: {
  type: "producer" | "mvz";
  fullName: string;
  email: string;
  createdByUserId?: string;
}) {
  const supabaseAdmin = getSupabaseProvisioningClient();

  for (const slug of buildSlugCandidates(input.fullName, input.email)) {
    const tenantInsert = await supabaseAdmin
      .from("tenants")
      .insert({
        type: input.type,
        slug,
        name: input.fullName,
        status: "active",
        created_by_user_id: input.createdByUserId ?? null,
      })
      .select("id,slug")
      .single();

    if (!tenantInsert.error && tenantInsert.data) {
      return {
        tenantId: tenantInsert.data.id,
        slug: tenantInsert.data.slug,
      };
    }
  }

  throw new Error("TENANT_CREATE_FAILED");
}

export async function ensureTenantRole(input: {
  tenantId: string;
  roleKey: string;
  roleName: string;
  permissions: string[];
}) {
  const supabaseAdmin = getSupabaseProvisioningClient();

  const roleLookup = await supabaseAdmin
    .from("tenant_roles")
    .select("id")
    .eq("tenant_id", input.tenantId)
    .eq("key", input.roleKey)
    .maybeSingle();

  let roleId = roleLookup.data?.id;
  if (!roleId) {
    const roleInsert = await supabaseAdmin
      .from("tenant_roles")
      .insert({
        tenant_id: input.tenantId,
        key: input.roleKey,
        name: input.roleName,
        is_system: true,
        priority: 50,
      })
      .select("id")
      .single();

    if (roleInsert.error || !roleInsert.data) {
      throw new Error(roleInsert.error?.message ?? "TENANT_ROLE_CREATE_FAILED");
    }
    roleId = roleInsert.data.id;
  }

  const permissionsResult = await supabaseAdmin
    .from("permissions")
    .select("id,key")
    .in("key", input.permissions);

  if (!permissionsResult.error && (permissionsResult.data ?? []).length > 0) {
    const existingLinksResult = await supabaseAdmin
      .from("tenant_role_permissions")
      .select("permission_id")
      .eq("tenant_role_id", roleId);

    const existingIds = new Set((existingLinksResult.data ?? []).map((row) => row.permission_id));
    const linksToInsert = (permissionsResult.data ?? [])
      .filter((permission) => !existingIds.has(permission.id))
      .map((permission) => ({
        tenant_role_id: roleId,
        permission_id: permission.id,
      }));

    if (linksToInsert.length > 0) {
      const permissionInsert = await supabaseAdmin
        .from("tenant_role_permissions")
        .insert(linksToInsert);
      if (permissionInsert.error) {
        throw new Error(permissionInsert.error.message);
      }
    }
  }

  return roleId;
}

export async function createMembershipAndAssignRole(input: {
  tenantId: string;
  userId: string;
  roleId: string;
  invitedByUserId?: string;
  assignedByUserId?: string;
}) {
  const supabaseAdmin = getSupabaseProvisioningClient();
  const membershipInsert = await supabaseAdmin
    .from("tenant_memberships")
    .insert({
      tenant_id: input.tenantId,
      user_id: input.userId,
      status: "active",
      invited_by_user_id: input.invitedByUserId ?? null,
    })
    .select("id")
    .single();

  if (membershipInsert.error || !membershipInsert.data) {
    throw new Error(membershipInsert.error?.message ?? "MEMBERSHIP_CREATE_FAILED");
  }

  const assignmentInsert = await supabaseAdmin.from("tenant_user_roles").insert({
    membership_id: membershipInsert.data.id,
    tenant_role_id: input.roleId,
    assigned_by_user_id: input.assignedByUserId ?? null,
  });

  if (assignmentInsert.error) {
    throw new Error(assignmentInsert.error.message);
  }

  return {
    membershipId: membershipInsert.data.id,
  };
}

export async function ensureAuthUserForEmail(input: {
  email: string;
  redirectTo: string;
}): Promise<{ userId: string; invitationSent: boolean }> {
  const supabaseAdmin = getSupabaseProvisioningClient();
  const existingProfile = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", input.email)
    .maybeSingle();

  if (existingProfile.error) {
    throw new Error(existingProfile.error.message);
  }

  if (existingProfile.data?.id) {
    return {
      userId: existingProfile.data.id,
      invitationSent: false,
    };
  }

  const inviteResult = await inviteAuthUserByEmail({
    email: input.email,
    redirectTo: input.redirectTo,
  });

  if (inviteResult.error || !inviteResult.data.user) {
    throw new Error(inviteResult.error?.message ?? "AUTH_INVITE_FAILED");
  }

  const userId = inviteResult.data.user.id;
  const profileExists = await waitForProfile(userId);

  if (!profileExists) {
    await deleteAuthUser(userId);
    throw new Error("PROFILE_NOT_CREATED");
  }

  return {
    userId,
    invitationSent: true,
  };
}
