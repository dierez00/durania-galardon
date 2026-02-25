import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";

interface ProducerBody {
  id?: string;
  userId?: string;
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

  const tenantId = auth.context.user.tenantId;
  const supabaseAdmin = getSupabaseAdminClient();

  const producersResult = await supabaseAdmin
    .from("producers")
    .select("id,user_id,curp,full_name,status,created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (producersResult.error) {
    return apiError("ADMIN_PRODUCERS_QUERY_FAILED", producersResult.error.message, 500);
  }

  const producers = producersResult.data ?? [];
  const producerIds = producers.map((row) => row.id);

  let documentSummaryByProducer = new Map<string, { validated: number; pending: number; expired: number }>();
  if (producerIds.length > 0) {
    const documentsResult = await supabaseAdmin
      .from("producer_documents")
      .select("producer_id,status")
      .eq("tenant_id", tenantId)
      .in("producer_id", producerIds);

    if (!documentsResult.error) {
      documentSummaryByProducer = (documentsResult.data ?? []).reduce((acc, row) => {
        const current = acc.get(row.producer_id) ?? { validated: 0, pending: 0, expired: 0 };
        if (row.status === "validated") {
          current.validated += 1;
        } else if (row.status === "pending") {
          current.pending += 1;
        } else if (row.status === "expired") {
          current.expired += 1;
        }
        acc.set(row.producer_id, current);
        return acc;
      }, new Map<string, { validated: number; pending: number; expired: number }>());
    }
  }

  return apiSuccess({
    producers: producers.map((producer) => ({
      ...producer,
      documents: documentSummaryByProducer.get(producer.id) ?? { validated: 0, pending: 0, expired: 0 },
    })),
  });
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

  const fullName = body.fullName?.trim();
  const curp = body.curp?.trim() || null;
  const userId = body.userId?.trim() || null;

  if (!fullName) {
    return apiError("INVALID_PAYLOAD", "Debe enviar fullName.");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const createResult = await supabaseAdmin
    .from("producers")
    .insert({
      tenant_id: auth.context.user.tenantId,
      user_id: userId,
      curp,
      full_name: fullName,
      status: "active",
    })
    .select("id,user_id,curp,full_name,status,created_at")
    .single();

  if (createResult.error || !createResult.data) {
    return apiError(
      "ADMIN_PRODUCER_CREATE_FAILED",
      createResult.error?.message ?? "No fue posible crear productor.",
      400
    );
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "create",
    resource: "admin.producers",
    resourceId: createResult.data.id,
    payload: { curp, fullName, userId },
  });

  return apiSuccess({ producer: createResult.data }, { status: 201 });
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

  const status = body.status;
  const fullName = body.fullName?.trim();

  if (!status && !fullName) {
    return apiError("INVALID_PAYLOAD", "Debe enviar status o fullName para actualizar.");
  }

  const updatePayload: Record<string, unknown> = {};
  if (status) {
    updatePayload.status = status;
  }
  if (fullName) {
    updatePayload.full_name = fullName;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const updateResult = await supabaseAdmin
    .from("producers")
    .update(updatePayload)
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("id", id)
    .select("id,user_id,curp,full_name,status,created_at")
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
    action: status ? "status_change" : "update",
    resource: "admin.producers",
    resourceId: id,
    payload: { status: status ?? null, fullName: fullName ?? null },
  });

  return apiSuccess({ producer: updateResult.data });
}
