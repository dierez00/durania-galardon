import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { logAuditEvent } from "@/server/audit";

interface CreateTenantRoleBody {
  key?: string;
  name?: string;
  priority?: number;
  permissionKeys?: string[];
}

interface PatchTenantRoleBody {
  id?: string;
  name?: string;
  priority?: number;
}

function normalizeRoleKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.users.roles"],
    resource: "tenant.iam.roles",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const rolesResult = await supabaseAdmin
    .from("tenant_roles")
    .select("id,key,name,is_system,priority,created_at")
    .eq("tenant_id", auth.context.user.tenantId)
    .order("priority", { ascending: true });

  if (rolesResult.error) {
    return apiError("TENANT_ROLES_QUERY_FAILED", rolesResult.error.message, 500);
  }

  const roleIds = (rolesResult.data ?? []).map((role) => role.id);
  let permissionSummary: Record<string, number> = {};

  if (roleIds.length > 0) {
    const permissionsResult = await supabaseAdmin
      .from("tenant_role_permissions")
      .select("tenant_role_id")
      .in("tenant_role_id", roleIds);

    if (permissionsResult.error) {
      return apiError("TENANT_ROLE_PERMISSIONS_QUERY_FAILED", permissionsResult.error.message, 500);
    }

    permissionSummary = (permissionsResult.data ?? []).reduce<Record<string, number>>((acc, row) => {
      acc[row.tenant_role_id] = (acc[row.tenant_role_id] ?? 0) + 1;
      return acc;
    }, {});
  }

  return apiSuccess({
    roles: (rolesResult.data ?? []).map((role) => ({
      ...role,
      permissionsCount: permissionSummary[role.id] ?? 0,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.users.roles"],
    resource: "tenant.iam.roles",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: CreateTenantRoleBody;
  try {
    body = (await request.json()) as CreateTenantRoleBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const key = body.key ? normalizeRoleKey(body.key) : "";
  const name = body.name?.trim();
  const priority = body.priority ?? 100;
  const permissionKeys = (body.permissionKeys ?? []).map((permission) => permission.trim()).filter(Boolean);

  if (!key || !name) {
    return apiError("INVALID_PAYLOAD", "Debe enviar key y name para crear rol tenant.");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const createRoleResult = await supabaseAdmin
    .from("tenant_roles")
    .insert({
      tenant_id: auth.context.user.tenantId,
      key,
      name,
      priority,
      is_system: false,
    })
    .select("id,key,name,is_system,priority,created_at")
    .single();

  if (createRoleResult.error || !createRoleResult.data) {
    return apiError(
      "TENANT_ROLE_CREATE_FAILED",
      createRoleResult.error?.message ?? "No fue posible crear rol tenant.",
      400
    );
  }

  if (permissionKeys.length > 0) {
    const permissionsResult = await supabaseAdmin
      .from("permissions")
      .select("id,key")
      .in("key", permissionKeys);

    if (permissionsResult.error) {
      return apiError("PERMISSIONS_QUERY_FAILED", permissionsResult.error.message, 500);
    }

    const permissions = permissionsResult.data ?? [];
    if (permissions.length !== permissionKeys.length) {
      return apiError("PERMISSIONS_NOT_FOUND", "Uno o mas permissionKeys no existen.", 400);
    }

    const insertPermissions = await supabaseAdmin.from("tenant_role_permissions").insert(
      permissions.map((permission) => ({
        tenant_role_id: createRoleResult.data.id,
        permission_id: permission.id,
      }))
    );

    if (insertPermissions.error) {
      return apiError("TENANT_ROLE_PERMISSIONS_CREATE_FAILED", insertPermissions.error.message, 400);
    }
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "create",
    resource: "tenant.iam.roles",
    resourceId: createRoleResult.data.id,
    payload: {
      key,
      name,
      permissionKeys,
    },
  });

  return apiSuccess(
    {
      role: {
        ...createRoleResult.data,
        permissionsCount: permissionKeys.length,
      },
    },
    { status: 201 }
  );
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.users.roles"],
    resource: "tenant.iam.roles",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: PatchTenantRoleBody;
  try {
    body = (await request.json()) as PatchTenantRoleBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const id = body.id?.trim();
  const nextName = body.name?.trim();
  const nextPriority = body.priority;

  if (!id || (!nextName && typeof nextPriority !== "number")) {
    return apiError("INVALID_PAYLOAD", "Debe enviar id y al menos un campo a actualizar.");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const roleLookup = await supabaseAdmin
    .from("tenant_roles")
    .select("id,is_system")
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("id", id)
    .maybeSingle();

  if (roleLookup.error) {
    return apiError("TENANT_ROLE_QUERY_FAILED", roleLookup.error.message, 500);
  }

  if (!roleLookup.data) {
    return apiError("TENANT_ROLE_NOT_FOUND", "No existe rol tenant con ese id.", 404);
  }

  if (roleLookup.data.is_system) {
    return apiError("TENANT_ROLE_SYSTEM_LOCKED", "No se permite editar roles de sistema.", 400);
  }

  const updateRoleResult = await supabaseAdmin
    .from("tenant_roles")
    .update({
      ...(nextName ? { name: nextName } : {}),
      ...(typeof nextPriority === "number" ? { priority: nextPriority } : {}),
    })
    .eq("id", id)
    .eq("tenant_id", auth.context.user.tenantId)
    .select("id,key,name,is_system,priority,created_at")
    .single();

  if (updateRoleResult.error || !updateRoleResult.data) {
    return apiError(
      "TENANT_ROLE_UPDATE_FAILED",
      updateRoleResult.error?.message ?? "No fue posible actualizar rol tenant.",
      400
    );
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "update",
    resource: "tenant.iam.roles",
    resourceId: id,
    payload: {
      name: nextName ?? null,
      priority: typeof nextPriority === "number" ? nextPriority : null,
    },
  });

  return apiSuccess({ role: updateRoleResult.data });
}
