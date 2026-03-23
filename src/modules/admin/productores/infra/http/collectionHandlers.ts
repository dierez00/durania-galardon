import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { logAuditEvent } from "@/server/audit";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";
import { ServerAdminProductoresRepository } from "@/modules/admin/productores/infra/supabase/ServerAdminProductoresRepository";

interface ProducerBody {
  id?: string;
  email?: string;
  fullName?: string;
  curp?: string;
  status?: "active" | "inactive";
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.producers.read"],
    resource: "admin.producers",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const repository = new ServerAdminProductoresRepository(
    auth.context.user.tenantId,
    auth.context.user.id
  );

  try {
    const result = await repository.list({
      search: url.searchParams.get("search")?.trim() ?? "",
      status: url.searchParams.get("status")?.trim() ?? "",
      dateFrom: url.searchParams.get("dateFrom")?.trim() ?? "",
      dateTo: url.searchParams.get("dateTo")?.trim() ?? "",
      page: Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10)),
      limit: Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "20", 10))),
      sortBy: (url.searchParams.get("sortBy") ?? "registered_at") as
        | "registered_at"
        | "docs_validated"
        | "docs_pending"
        | "docs_issues",
      sortDir: (url.searchParams.get("sortDir") ?? "desc") as "asc" | "desc",
    });

    return apiSuccess(result);
  } catch (error) {
    return apiError(
      "ADMIN_PRODUCERS_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar productores.",
      500
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.producers.write"],
    resource: "admin.producers",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: ProducerBody;
  try {
    body = (await request.json()) as ProducerBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const email = body.email?.trim().toLowerCase();
  const fullName = body.fullName?.trim();

  if (!email || !fullName) {
    return apiError("INVALID_PAYLOAD", "Debe enviar email y fullName para crear productor.");
  }

  const repository = new ServerAdminProductoresRepository(
    auth.context.user.tenantId,
    auth.context.user.id
  );

  try {
    const result = await repository.create({
      email,
      fullName,
      curp: body.curp?.trim() || undefined,
    });

    await logAuditEvent({
      request,
      user: auth.context.user,
      action: "create",
      resource: "admin.producers",
      resourceId: result.producer.id,
      payload: {
        email,
        fullName,
        invitationSent: result.invitationSent,
      },
    });

    return apiSuccess(
      {
        producer: result.producer,
        invitationSent: result.invitationSent,
      },
      { status: 201 }
    );
  } catch (error) {
    return apiError(
      "ADMIN_PRODUCER_CREATE_FAILED",
      error instanceof Error ? error.message : "No fue posible crear productor.",
      400
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.producers.write"],
    resource: "admin.producers",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: ProducerBody;
  try {
    body = (await request.json()) as ProducerBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const id = body.id?.trim();
  if (!id) {
    return apiError("INVALID_PAYLOAD", "Debe enviar id del productor.");
  }

  const updatePayload: Record<string, unknown> = {};
  if (body.status) {
    updatePayload.status = body.status;
  }
  if (body.fullName?.trim()) {
    updatePayload.full_name = body.fullName.trim();
  }
  if (body.curp !== undefined) {
    updatePayload.curp = body.curp?.trim() || null;
  }

  if (Object.keys(updatePayload).length === 0) {
    return apiError("INVALID_PAYLOAD", "Debe enviar al menos un campo para actualizar.");
  }

  const supabaseAdmin = getSupabaseProvisioningClient();
  const updateResult = await supabaseAdmin
    .from("producers")
    .update(updatePayload)
    .eq("id", id)
    .select("id,user_id,owner_tenant_id,curp,full_name,status,created_at")
    .maybeSingle();

  if (updateResult.error) {
    return apiError("ADMIN_PRODUCER_UPDATE_FAILED", updateResult.error.message, 400);
  }

  if (!updateResult.data) {
    return apiError("ADMIN_PRODUCER_NOT_FOUND", "No existe productor con ese id.", 404);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: body.status ? "status_change" : "update",
    resource: "admin.producers",
    resourceId: id,
    payload: updatePayload,
  });

  return apiSuccess({ producer: updateResult.data });
}
