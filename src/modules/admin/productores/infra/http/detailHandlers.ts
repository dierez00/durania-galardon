import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { logAuditEvent } from "@/server/audit";
import { UpdateAdminProductorInfoValidationError } from "@/modules/admin/productores/application/dto/UpdateAdminProductorInfoDTO";
import { UpdateAdminProductorInfoUseCase } from "@/modules/admin/productores/application/use-cases/UpdateAdminProductorInfo";
import { ServerAdminProductorDetailRepository } from "@/modules/admin/productores/infra/supabase/ServerAdminProductorDetailRepository";

interface PatchBody {
  status?: "active" | "inactive";
  fullName?: string;
  curp?: string | null;
  email?: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.producers.read"],
    resource: "admin.producers",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const repository = new ServerAdminProductorDetailRepository();

  try {
    const producer = await repository.getById(id);
    if (!producer) {
      return apiError("ADMIN_PRODUCER_NOT_FOUND", "No existe productor con ese id.", 404);
    }

    return apiSuccess({ producer });
  } catch (error) {
    return apiError(
      "ADMIN_PRODUCER_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar productor.",
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
    permissions: ["admin.producers.write"],
    resource: "admin.producers",
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

  if (!body.status && body.fullName === undefined && body.curp === undefined && body.email === undefined) {
    return apiError("INVALID_PAYLOAD", "Debe enviar al menos un campo para actualizar.");
  }

  const repository = new ServerAdminProductorDetailRepository();

  try {
    if (body.status) {
      await repository.updateStatus(id, body.status);
    }

    if (body.fullName !== undefined || body.curp !== undefined || body.email !== undefined) {
      const useCase = new UpdateAdminProductorInfoUseCase(repository);
      await useCase.execute(id, {
        fullName: body.fullName,
        curp: body.curp,
        email: body.email,
      });
    }

    const producer = await repository.getById(id);
    if (!producer) {
      return apiError("ADMIN_PRODUCER_NOT_FOUND", "No existe productor con ese id.", 404);
    }

    await logAuditEvent({
      request,
      user: auth.context.user,
      action: body.status ? "status_change" : "update",
      resource: "admin.producers",
      resourceId: id,
      payload: {
        status: body.status,
        fullName: body.fullName,
        curp: body.curp,
        email: body.email,
      },
    });

    return apiSuccess({
      producer: {
        id: producer.id,
        full_name: producer.fullName,
        curp: producer.curp,
        email: producer.email,
        status: producer.status,
        created_at: producer.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof UpdateAdminProductorInfoValidationError) {
      return apiError("INVALID_PAYLOAD", error.message, 400, { field: error.field });
    }

    return apiError(
      "ADMIN_PRODUCER_UPDATE_FAILED",
      error instanceof Error ? error.message : "No fue posible actualizar productor.",
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
    permissions: ["admin.producers.write"],
    resource: "admin.producers",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await params;
  const repository = new ServerAdminProductorDetailRepository();

  try {
    await repository.deleteProductor(id);
  } catch {
    return apiError("ADMIN_PRODUCER_NOT_FOUND", "No existe productor con ese id.", 404);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "delete",
    resource: "admin.producers",
    resourceId: id,
    payload: {},
  });

  return apiSuccess({ ok: true });
}
