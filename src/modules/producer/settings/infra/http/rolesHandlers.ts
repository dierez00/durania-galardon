import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import {
  createCustomRoleForPanel,
  deleteRoleForPanel,
  listTenantRolesForPanel,
  updateCustomRoleForPanel,
} from "@/server/authz/tenantRoles";
import { logAuditEvent } from "@/server/audit";

interface ProducerRoleBody {
  roleId?: string;
  name?: string;
  permissionKeys?: string[];
  cloneFromRoleId?: string | null;
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee", "producer_viewer"],
    permissions: ["producer.roles.read", "producer.roles.write"],
    resource: "producer.roles",
  });
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const payload = await listTenantRolesForPanel(auth.context.user.tenantId, "producer");
    return apiSuccess(payload);
  } catch (error) {
    return apiError(
      "PRODUCER_ROLES_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar los roles del tenant.",
      500
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee", "producer_viewer"],
    permissions: ["producer.roles.write"],
    resource: "producer.roles",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: ProducerRoleBody;
  try {
    body = (await request.json()) as ProducerRoleBody;
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
      panel: "producer",
      name,
      permissionKeys: body.permissionKeys,
      cloneFromRoleId: body.cloneFromRoleId,
    });

    await logAuditEvent({
      request,
      user: auth.context.user,
      action: "create",
      resource: "producer.roles",
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
      "PRODUCER_ROLE_CREATE_FAILED",
      error instanceof Error ? error.message : "No fue posible crear el rol.",
      400
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee", "producer_viewer"],
    permissions: ["producer.roles.write"],
    resource: "producer.roles",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: ProducerRoleBody;
  try {
    body = (await request.json()) as ProducerRoleBody;
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
      panel: "producer",
      roleId,
      name: body.name?.trim(),
      permissionKeys: body.permissionKeys,
    });

    await logAuditEvent({
      request,
      user: auth.context.user,
      action: "update",
      resource: "producer.roles",
      resourceId: updatedRole.id,
      payload: {
        name: updatedRole.name,
        permissionKeys: body.permissionKeys ?? null,
      },
    });

    return apiSuccess(updatedRole);
  } catch (error) {
    return apiError(
      "PRODUCER_ROLE_UPDATE_FAILED",
      error instanceof Error ? error.message : "No fue posible actualizar el rol.",
      400
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee", "producer_viewer"],
    permissions: ["producer.roles.write"],
    resource: "producer.roles",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: ProducerRoleBody;
  try {
    body = (await request.json()) as ProducerRoleBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const roleId = body.roleId?.trim();
  if (!roleId) {
    return apiError("INVALID_PAYLOAD", "Debe enviar roleId para eliminar el rol.");
  }

  try {
    const deletedRole = await deleteRoleForPanel({
      tenantId: auth.context.user.tenantId,
      panel: "producer",
      roleId,
    });

    await logAuditEvent({
      request,
      user: auth.context.user,
      action: "delete",
      resource: "producer.roles",
      resourceId: deletedRole.id,
      payload: {
        key: deletedRole.key,
        name: deletedRole.name,
        isSystem: deletedRole.isSystem,
      },
    });

    return apiSuccess(deletedRole);
  } catch (error) {
    return apiError(
      "PRODUCER_ROLE_DELETE_FAILED",
      error instanceof Error ? error.message : "No fue posible eliminar el rol.",
      400
    );
  }
}
