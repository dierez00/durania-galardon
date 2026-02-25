import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { logAuditEvent } from "@/server/audit";

interface UpdateRolePermissionsBody {
  permissionKeys?: string[];
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.users.roles"],
    resource: "tenant.iam.role-permissions",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;
  if (!id) {
    return apiError("INVALID_ID", "Debe indicar id del rol tenant.");
  }

  let body: UpdateRolePermissionsBody;
  try {
    body = (await request.json()) as UpdateRolePermissionsBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const permissionKeys = (body.permissionKeys ?? []).map((key) => key.trim()).filter(Boolean);

  const supabaseAdmin = getSupabaseAdminClient();
  const roleResult = await supabaseAdmin
    .from("tenant_roles")
    .select("id")
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("id", id)
    .maybeSingle();

  if (roleResult.error) {
    return apiError("TENANT_ROLE_QUERY_FAILED", roleResult.error.message, 500);
  }

  if (!roleResult.data) {
    return apiError("TENANT_ROLE_NOT_FOUND", "No existe rol tenant con ese id.", 404);
  }

  const removeExisting = await supabaseAdmin
    .from("tenant_role_permissions")
    .delete()
    .eq("tenant_role_id", id);

  if (removeExisting.error) {
    return apiError("TENANT_ROLE_PERMISSIONS_CLEAR_FAILED", removeExisting.error.message, 400);
  }

  if (permissionKeys.length === 0) {
    return apiSuccess({ roleId: id, permissionKeys: [] });
  }

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

  const insertResult = await supabaseAdmin.from("tenant_role_permissions").insert(
    permissions.map((permission) => ({
      tenant_role_id: id,
      permission_id: permission.id,
    }))
  );

  if (insertResult.error) {
    return apiError("TENANT_ROLE_PERMISSIONS_UPDATE_FAILED", insertResult.error.message, 400);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "update",
    resource: "tenant.iam.role-permissions",
    resourceId: id,
    payload: { permissionKeys },
  });

  return apiSuccess({
    roleId: id,
    permissionKeys: permissions.map((permission) => permission.key),
  });
}
