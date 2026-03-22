import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import {
  createCustomRoleForPanel,
  listTenantRolesForPanel,
  updateCustomRoleForPanel,
} from "@/server/authz/tenantRoles";
import { logAuditEvent } from "@/server/audit";

interface MvzRoleBody {
  roleId?: string;
  name?: string;
  permissionKeys?: string[];
  cloneFromRoleId?: string | null;
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government"],
    permissions: ["mvz.roles.read", "mvz.roles.write"],
    resource: "mvz.roles",
  });
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const payload = await listTenantRolesForPanel(auth.context.user.tenantId, "mvz");
    return apiSuccess(payload);
  } catch (error) {
    return apiError(
      "MVZ_ROLES_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar los roles del tenant.",
      500
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government"],
    permissions: ["mvz.roles.write"],
    resource: "mvz.roles",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: MvzRoleBody;
  try {
    body = (await request.json()) as MvzRoleBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const name = body.name?.trim();
  if (!name) {
    return apiError("INVALID_PAYLOAD", "Debe enviar name para crear el rol.");
  }

  try {
    const createdRole = await createCustomRoleForPanel({
      tenantId: auth.context.user.tenantId,
      panel: "mvz",
      name,
      permissionKeys: body.permissionKeys,
      cloneFromRoleId: body.cloneFromRoleId,
    });

    await logAuditEvent({
      request,
      user: auth.context.user,
      action: "create",
      resource: "mvz.roles",
      resourceId: createdRole.id,
      payload: {
        key: createdRole.key,
        name: createdRole.name,
        cloneFromRoleId: body.cloneFromRoleId ?? null,
        permissionKeys: createdRole.permissions,
      },
    });

    return apiSuccess(createdRole, { status: 201 });
  } catch (error) {
    return apiError(
      "MVZ_ROLE_CREATE_FAILED",
      error instanceof Error ? error.message : "No fue posible crear el rol.",
      400
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government"],
    permissions: ["mvz.roles.write"],
    resource: "mvz.roles",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: MvzRoleBody;
  try {
    body = (await request.json()) as MvzRoleBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const roleId = body.roleId?.trim();
  if (!roleId) {
    return apiError("INVALID_PAYLOAD", "Debe enviar roleId para actualizar el rol.");
  }

  try {
    const updatedRole = await updateCustomRoleForPanel({
      tenantId: auth.context.user.tenantId,
      panel: "mvz",
      roleId,
      name: body.name?.trim(),
      permissionKeys: body.permissionKeys,
    });

    await logAuditEvent({
      request,
      user: auth.context.user,
      action: "update",
      resource: "mvz.roles",
      resourceId: updatedRole.id,
      payload: {
        name: updatedRole.name,
        permissionKeys: body.permissionKeys ?? null,
      },
    });

    return apiSuccess(updatedRole);
  } catch (error) {
    return apiError(
      "MVZ_ROLE_UPDATE_FAILED",
      error instanceof Error ? error.message : "No fue posible actualizar el rol.",
      400
    );
  }
}
