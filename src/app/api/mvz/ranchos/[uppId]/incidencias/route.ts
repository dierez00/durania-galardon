import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireMvzRanchAccess } from "@/app/api/mvz/ranchos/_utils";

interface IncidentBody {
  id?: string;
  animalId?: string;
  incidentType?: string;
  severity?: "low" | "medium" | "high" | "critical";
  status?: "open" | "in_progress" | "resolved" | "dismissed";
  description?: string;
  detectedAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ uppId: string }> }
) {
  const { uppId } = await context.params;
  const access = await requireMvzRanchAccess(
    request,
    uppId,
    "mvz.ranch.incidents.read",
    "mvz.ranch.incidents"
  );
  if (!access.ok) {
    return access.response;
  }

  const rowsResult = await access.supabase
    .from("sanitary_incidents")
    .select(
      "id,tenant_id,upp_id,animal_id,incident_type,severity,status,detected_at,resolved_at,description,resolution_notes,reported_by_mvz_profile_id,created_at,updated_at"
    )
    .eq("upp_id", uppId)
    .order("detected_at", { ascending: false });

  if (rowsResult.error) {
    return apiError("MVZ_RANCH_INCIDENTS_QUERY_FAILED", rowsResult.error.message, 500);
  }

  return apiSuccess({ incidents: rowsResult.data ?? [] });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ uppId: string }> }
) {
  const { uppId } = await context.params;
  const access = await requireMvzRanchAccess(
    request,
    uppId,
    "mvz.ranch.incidents.write",
    "mvz.ranch.incidents"
  );
  if (!access.ok) {
    return access.response;
  }

  let body: IncidentBody;
  try {
    body = (await request.json()) as IncidentBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const animalId = body.animalId?.trim();
  const incidentType = body.incidentType?.trim();
  if (!animalId || !incidentType) {
    return apiError("INVALID_PAYLOAD", "Debe enviar animalId e incidentType.");
  }

  const animalResult = await access.supabase
    .from("animals")
    .select("id")
    .eq("id", animalId)
    .eq("upp_id", uppId)
    .maybeSingle();

  if (animalResult.error || !animalResult.data) {
    return apiError("ANIMAL_NOT_FOUND", "El animal no pertenece a la UPP seleccionada.", 404);
  }

  const insertResult = await access.supabase
    .from("sanitary_incidents")
    .insert({
      tenant_id: access.upp.tenant_id,
      upp_id: uppId,
      animal_id: animalId,
      incident_type: incidentType,
      severity: body.severity ?? "medium",
      status: body.status ?? "open",
      description: body.description?.trim() || null,
      detected_at: body.detectedAt ?? new Date().toISOString(),
      reported_by_mvz_profile_id: access.mvzProfileId,
      updated_at: new Date().toISOString(),
    })
    .select(
      "id,tenant_id,upp_id,animal_id,incident_type,severity,status,detected_at,resolved_at,description,resolution_notes,reported_by_mvz_profile_id,created_at,updated_at"
    )
    .single();

  if (insertResult.error || !insertResult.data) {
    return apiError(
      "MVZ_RANCH_INCIDENT_CREATE_FAILED",
      insertResult.error?.message ?? "No fue posible registrar incidencia.",
      400
    );
  }

  return apiSuccess({ incident: insertResult.data }, { status: 201 });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ uppId: string }> }
) {
  const { uppId } = await context.params;
  const access = await requireMvzRanchAccess(
    request,
    uppId,
    "mvz.ranch.incidents.write",
    "mvz.ranch.incidents"
  );
  if (!access.ok) {
    return access.response;
  }

  let body: IncidentBody;
  try {
    body = (await request.json()) as IncidentBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const id = body.id?.trim();
  if (!id) {
    return apiError("INVALID_PAYLOAD", "Debe enviar id de incidencia.");
  }

  const lookup = await access.supabase
    .from("sanitary_incidents")
    .select("id")
    .eq("id", id)
    .eq("upp_id", uppId)
    .maybeSingle();

  if (lookup.error || !lookup.data) {
    return apiError("MVZ_RANCH_INCIDENT_NOT_FOUND", "No existe incidencia para la UPP enviada.", 404);
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.incidentType !== undefined) {
    const incidentType = body.incidentType.trim();
    if (!incidentType) {
      return apiError("INVALID_PAYLOAD", "incidentType no puede ser vacio.");
    }
    updatePayload.incident_type = incidentType;
  }
  if (body.severity) {
    updatePayload.severity = body.severity;
  }
  if (body.status) {
    updatePayload.status = body.status;
    if (body.status === "resolved" && body.resolvedAt === undefined) {
      updatePayload.resolved_at = new Date().toISOString();
    }
  }
  if (body.description !== undefined) {
    updatePayload.description = body.description?.trim() || null;
  }
  if (body.detectedAt !== undefined) {
    updatePayload.detected_at = body.detectedAt || null;
  }
  if (body.resolvedAt !== undefined) {
    updatePayload.resolved_at = body.resolvedAt || null;
  }
  if (body.resolutionNotes !== undefined) {
    updatePayload.resolution_notes = body.resolutionNotes?.trim() || null;
  }

  const updateResult = await access.supabase
    .from("sanitary_incidents")
    .update(updatePayload)
    .eq("id", id)
    .eq("upp_id", uppId)
    .select(
      "id,tenant_id,upp_id,animal_id,incident_type,severity,status,detected_at,resolved_at,description,resolution_notes,reported_by_mvz_profile_id,created_at,updated_at"
    )
    .maybeSingle();

  if (updateResult.error) {
    return apiError("MVZ_RANCH_INCIDENT_UPDATE_FAILED", updateResult.error.message, 400);
  }

  if (!updateResult.data) {
    return apiError("MVZ_RANCH_INCIDENT_NOT_FOUND", "No existe incidencia para la UPP enviada.", 404);
  }

  return apiSuccess({ incident: updateResult.data });
}


