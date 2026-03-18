import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireMvzRanchAccess } from "@/app/api/mvz/ranchos/_utils";

interface VisitBody {
  id?: string;
  visitType?: string;
  status?: "scheduled" | "in_progress" | "completed" | "cancelled";
  scheduledAt?: string;
  startedAt?: string;
  finishedAt?: string;
  notes?: string;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ uppId: string }> }
) {
  const { uppId } = await context.params;
  const access = await requireMvzRanchAccess(
    request,
    uppId,
    "mvz.ranch.visits.read",
    "mvz.ranch.visits"
  );
  if (!access.ok) {
    return access.response;
  }

  const rowsResult = await access.supabaseAdmin
    .from("mvz_visits")
    .select(
      "id,tenant_id,upp_id,mvz_profile_id,visit_type,status,scheduled_at,started_at,finished_at,notes,created_by_user_id,created_at,updated_at"
    )
    .eq("upp_id", uppId)
    .order("scheduled_at", { ascending: false });

  if (rowsResult.error) {
    return apiError("MVZ_RANCH_VISITS_QUERY_FAILED", rowsResult.error.message, 500);
  }

  return apiSuccess({ visits: rowsResult.data ?? [] });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ uppId: string }> }
) {
  const { uppId } = await context.params;
  const access = await requireMvzRanchAccess(
    request,
    uppId,
    "mvz.ranch.visits.write",
    "mvz.ranch.visits"
  );
  if (!access.ok) {
    return access.response;
  }

  let body: VisitBody;
  try {
    body = (await request.json()) as VisitBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const scheduledAt = body.scheduledAt;
  if (!scheduledAt) {
    return apiError("INVALID_PAYLOAD", "Debe enviar scheduledAt para crear una visita.");
  }

  const insertResult = await access.supabaseAdmin
    .from("mvz_visits")
    .insert({
      tenant_id: access.upp.tenant_id,
      upp_id: uppId,
      mvz_profile_id: access.mvzProfileId,
      visit_type: body.visitType?.trim() || "inspection",
      status: body.status ?? "scheduled",
      scheduled_at: scheduledAt,
      started_at: body.startedAt ?? null,
      finished_at: body.finishedAt ?? null,
      notes: body.notes?.trim() || null,
      created_by_user_id: access.context.user.id,
      updated_at: new Date().toISOString(),
    })
    .select(
      "id,tenant_id,upp_id,mvz_profile_id,visit_type,status,scheduled_at,started_at,finished_at,notes,created_by_user_id,created_at,updated_at"
    )
    .single();

  if (insertResult.error || !insertResult.data) {
    return apiError(
      "MVZ_RANCH_VISIT_CREATE_FAILED",
      insertResult.error?.message ?? "No fue posible crear visita.",
      400
    );
  }

  return apiSuccess({ visit: insertResult.data }, { status: 201 });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ uppId: string }> }
) {
  const { uppId } = await context.params;
  const access = await requireMvzRanchAccess(
    request,
    uppId,
    "mvz.ranch.visits.write",
    "mvz.ranch.visits"
  );
  if (!access.ok) {
    return access.response;
  }

  let body: VisitBody;
  try {
    body = (await request.json()) as VisitBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const id = body.id?.trim();
  if (!id) {
    return apiError("INVALID_PAYLOAD", "Debe enviar id de visita.");
  }

  const lookup = await access.supabaseAdmin
    .from("mvz_visits")
    .select("id")
    .eq("id", id)
    .eq("upp_id", uppId)
    .maybeSingle();

  if (lookup.error || !lookup.data) {
    return apiError("MVZ_RANCH_VISIT_NOT_FOUND", "No existe visita para la UPP enviada.", 404);
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.visitType !== undefined) {
    const visitType = body.visitType.trim();
    if (!visitType) {
      return apiError("INVALID_PAYLOAD", "visitType no puede ser vacio.");
    }
    updatePayload.visit_type = visitType;
  }
  if (body.status) {
    updatePayload.status = body.status;
  }
  if (body.scheduledAt !== undefined) {
    updatePayload.scheduled_at = body.scheduledAt || null;
  }
  if (body.startedAt !== undefined) {
    updatePayload.started_at = body.startedAt || null;
  }
  if (body.finishedAt !== undefined) {
    updatePayload.finished_at = body.finishedAt || null;
  }
  if (body.notes !== undefined) {
    updatePayload.notes = body.notes?.trim() || null;
  }

  const updateResult = await access.supabaseAdmin
    .from("mvz_visits")
    .update(updatePayload)
    .eq("id", id)
    .eq("upp_id", uppId)
    .select(
      "id,tenant_id,upp_id,mvz_profile_id,visit_type,status,scheduled_at,started_at,finished_at,notes,created_by_user_id,created_at,updated_at"
    )
    .maybeSingle();

  if (updateResult.error) {
    return apiError("MVZ_RANCH_VISIT_UPDATE_FAILED", updateResult.error.message, 400);
  }

  if (!updateResult.data) {
    return apiError("MVZ_RANCH_VISIT_NOT_FOUND", "No existe visita para la UPP enviada.", 404);
  }

  return apiSuccess({ visit: updateResult.data });
}



