import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { resolveProducerId } from "@/server/authz/profiles";
import { logAuditEvent } from "@/server/audit";

interface ProducerProfileBody {
  fullName?: string;
  status?: "active" | "inactive";
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.profile.read"],
    resource: "producer.profile",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const producerId = await resolveProducerId(auth.context.user);

  const profileResult = await supabaseAdmin
    .from("profiles")
    .select("id,email,status,created_at")
    .eq("id", auth.context.user.id)
    .maybeSingle();

  if (profileResult.error || !profileResult.data) {
    return apiError("PRODUCER_PROFILE_NOT_FOUND", "No fue posible resolver perfil de usuario.", 404);
  }

  let producerInfo: Record<string, unknown> | null = null;
  if (producerId) {
    const producerResult = await supabaseAdmin
      .from("producers")
      .select("id,full_name,status,curp,created_at")
      .eq("tenant_id", auth.context.user.tenantId)
      .eq("id", producerId)
      .maybeSingle();

    if (!producerResult.error && producerResult.data) {
      producerInfo = producerResult.data;
    }
  }

  return apiSuccess({
    profile: profileResult.data,
    producer: producerInfo,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.profile.write"],
    resource: "producer.profile",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: ProducerProfileBody;
  try {
    body = (await request.json()) as ProducerProfileBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const updates: Record<string, unknown> = {};
  if (body.fullName?.trim()) {
    updates.full_name = body.fullName.trim();
  }
  if (body.status) {
    updates.status = body.status;
  }

  if (Object.keys(updates).length === 0) {
    return apiError("INVALID_PAYLOAD", "Debe enviar al menos un campo para actualizar.");
  }

  const producerId = await resolveProducerId(auth.context.user);
  if (!producerId) {
    return apiError("PRODUCER_PROFILE_NOT_FOUND", "No existe perfil productor asociado.", 404);
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const updateResult = await supabaseAdmin
    .from("producers")
    .update(updates)
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("id", producerId)
    .select("id,full_name,status,curp,created_at")
    .maybeSingle();

  if (updateResult.error) {
    return apiError("PRODUCER_PROFILE_UPDATE_FAILED", updateResult.error.message, 400);
  }

  if (!updateResult.data) {
    return apiError("PRODUCER_PROFILE_NOT_FOUND", "No existe perfil productor asociado.", 404);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: body.status ? "status_change" : "update",
    resource: "producer.profile",
    resourceId: producerId,
    payload: updates,
  });

  return apiSuccess({ producer: updateResult.data });
}
