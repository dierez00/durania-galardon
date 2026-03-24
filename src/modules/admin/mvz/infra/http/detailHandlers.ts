import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { logAuditEvent } from "@/server/audit";
import { UpdateAdminMvzInfoValidationError } from "@/modules/admin/mvz/application/dto/UpdateAdminMvzInfoDTO";
import { UpdateAdminMvzInfoUseCase } from "@/modules/admin/mvz/application/use-cases/UpdateAdminMvzInfo";
import { ServerAdminMvzDetailRepository } from "@/modules/admin/mvz/infra/supabase/ServerAdminMvzDetailRepository";

interface PatchBody {
  status?: "active" | "inactive";
  fullName?: string;
  licenseNumber?: string;
  email?: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.mvz.read"],
    resource: "admin.mvz",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const repository = new ServerAdminMvzDetailRepository();

  try {
    const mvz = await repository.getById(id);
    if (!mvz) {
      return apiError("ADMIN_MVZ_NOT_FOUND", "No existe MVZ con ese id.", 404);
    }

    return apiSuccess({ mvz });
  } catch (error) {
    return apiError(
      "ADMIN_MVZ_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar MVZ.",
      500
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.mvz.write"],
    resource: "admin.mvz",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  if (!body.status && body.fullName === undefined && body.licenseNumber === undefined && body.email === undefined) {
    return apiError("INVALID_PAYLOAD", "Debe enviar al menos un campo para actualizar.");
  }

  const repository = new ServerAdminMvzDetailRepository();

  try {
    if (body.status) {
      await repository.updateStatus(id, body.status);
    }

    if (body.fullName !== undefined || body.licenseNumber !== undefined || body.email !== undefined) {
      const useCase = new UpdateAdminMvzInfoUseCase(repository);
      await useCase.execute(id, {
        fullName: body.fullName,
        licenseNumber: body.licenseNumber,
        email: body.email,
      });
    }

    await logAuditEvent({
      request,
      user: auth.context.user,
      action: body.status ? "status_change" : "update",
      resource: "admin.mvz",
      resourceId: id,
      payload: {
        status: body.status,
        fullName: body.fullName,
        licenseNumber: body.licenseNumber,
        email: body.email,
      },
    });

    return apiSuccess({ ok: true });
  } catch (error) {
    if (error instanceof UpdateAdminMvzInfoValidationError) {
      return apiError("INVALID_PAYLOAD", error.message, 400, { field: error.field });
    }

    return apiError(
      "ADMIN_MVZ_UPDATE_FAILED",
      error instanceof Error ? error.message : "No fue posible actualizar MVZ.",
      400
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.mvz.write"],
    resource: "admin.mvz",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const repository = new ServerAdminMvzDetailRepository();

  try {
    await repository.deleteMvz(id);
  } catch {
    return apiError("ADMIN_MVZ_NOT_FOUND", "No existe MVZ con ese id.", 404);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "delete",
    resource: "admin.mvz",
    resourceId: id,
    payload: {},
  });

  return apiSuccess({ ok: true });
}
