import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";

interface UppBody {
  id?: string;
  producerId?: string;
  name?: string;
  uppCode?: string;
  addressText?: string;
  herdLimit?: number;
  status?: "active" | "quarantined" | "suspended";
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.upps.read"],
    resource: "admin.upps",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const tenantId = auth.context.user.tenantId;
  const supabaseAdmin = getSupabaseAdminClient();

  const uppsResult = await supabaseAdmin
    .from("upps")
    .select("id,producer_id,upp_code,name,address_text,herd_limit,status,created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (uppsResult.error) {
    return apiError("ADMIN_UPPS_QUERY_FAILED", uppsResult.error.message, 500);
  }

  const uppRows = uppsResult.data ?? [];
  const producerIds = [...new Set(uppRows.map((row) => row.producer_id))];

  const producersResult = producerIds.length
    ? await supabaseAdmin.from("producers").select("id,full_name").eq("tenant_id", tenantId).in("id", producerIds)
    : { data: [], error: null };

  const animalsResult = uppRows.length
    ? await supabaseAdmin
        .from("animals")
        .select("upp_id,id")
        .eq("tenant_id", tenantId)
        .in("upp_id", uppRows.map((row) => row.id))
    : { data: [], error: null };

  if (producersResult.error || animalsResult.error) {
    return apiError("ADMIN_UPPS_RELATED_QUERY_FAILED", "No fue posible resolver datos relacionados.", 500, {
      producers: producersResult.error?.message,
      animals: animalsResult.error?.message,
    });
  }

  const producerById = new Map((producersResult.data ?? []).map((producer) => [producer.id, producer.full_name]));
  const animalsByUpp = (animalsResult.data ?? []).reduce((acc, row) => {
    acc.set(row.upp_id, (acc.get(row.upp_id) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());

  return apiSuccess({
    upps: uppRows.map((upp) => ({
      ...upp,
      producerName: producerById.get(upp.producer_id) ?? "Sin productor",
      herdCount: animalsByUpp.get(upp.id) ?? 0,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.upps.write"],
    resource: "admin.upps",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: UppBody;
  try {
    body = (await request.json()) as UppBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const producerId = body.producerId?.trim();
  const name = body.name?.trim();

  if (!producerId || !name) {
    return apiError("INVALID_PAYLOAD", "Debe enviar producerId y name.");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const createResult = await supabaseAdmin
    .from("upps")
    .insert({
      tenant_id: auth.context.user.tenantId,
      producer_id: producerId,
      upp_code: body.uppCode?.trim() || null,
      name,
      address_text: body.addressText?.trim() || null,
      herd_limit: body.herdLimit ?? null,
      status: "active",
    })
    .select("id,producer_id,upp_code,name,address_text,herd_limit,status,created_at")
    .single();

  if (createResult.error || !createResult.data) {
    return apiError("ADMIN_UPP_CREATE_FAILED", createResult.error?.message ?? "No fue posible crear UPP.", 400);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "create",
    resource: "admin.upps",
    resourceId: createResult.data.id,
    payload: {
      producerId,
      name,
      uppCode: body.uppCode?.trim() || null,
      herdLimit: body.herdLimit ?? null,
    },
  });

  return apiSuccess({ upp: createResult.data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.upps.write"],
    resource: "admin.upps",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: UppBody;
  try {
    body = (await request.json()) as UppBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const id = body.id?.trim();
  if (!id) {
    return apiError("INVALID_PAYLOAD", "Debe enviar id de la UPP.");
  }

  const updatePayload: Record<string, unknown> = {};
  if (body.name?.trim()) {
    updatePayload.name = body.name.trim();
  }
  if (typeof body.herdLimit === "number") {
    updatePayload.herd_limit = body.herdLimit;
  }
  if (body.addressText !== undefined) {
    updatePayload.address_text = body.addressText?.trim() || null;
  }
  if (body.status) {
    updatePayload.status = body.status;
  }

  if (Object.keys(updatePayload).length === 0) {
    return apiError("INVALID_PAYLOAD", "Debe enviar al menos un campo para actualizar.");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const updateResult = await supabaseAdmin
    .from("upps")
    .update(updatePayload)
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("id", id)
    .select("id,producer_id,upp_code,name,address_text,herd_limit,status,created_at")
    .maybeSingle();

  if (updateResult.error) {
    return apiError("ADMIN_UPP_UPDATE_FAILED", updateResult.error.message, 400);
  }

  if (!updateResult.data) {
    return apiError("ADMIN_UPP_NOT_FOUND", "No existe UPP con ese id.", 404);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: body.status ? "status_change" : "update",
    resource: "admin.upps",
    resourceId: id,
    payload: updatePayload,
  });

  return apiSuccess({ upp: updateResult.data });
}
