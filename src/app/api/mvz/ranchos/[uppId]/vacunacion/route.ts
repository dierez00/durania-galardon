import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireMvzRanchAccess } from "@/app/api/mvz/ranchos/_utils";

interface VaccinationBody {
  id?: string;
  animalId?: string;
  vaccineName?: string;
  dose?: string;
  status?: "pending" | "applied" | "overdue" | "cancelled";
  appliedAt?: string;
  dueAt?: string;
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
    "mvz.ranch.vaccinations.read",
    "mvz.ranch.vaccinations"
  );
  if (!access.ok) {
    return access.response;
  }

  const rowsResult = await access.supabase
    .from("animal_vaccinations")
    .select(
      "id,tenant_id,upp_id,animal_id,vaccine_name,dose,status,applied_at,due_at,applied_by_mvz_profile_id,notes,created_at,updated_at"
    )
    .eq("upp_id", uppId)
    .order("created_at", { ascending: false });

  if (rowsResult.error) {
    return apiError("MVZ_RANCH_VACCINATIONS_QUERY_FAILED", rowsResult.error.message, 500);
  }

  return apiSuccess({ vaccinations: rowsResult.data ?? [] });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ uppId: string }> }
) {
  const { uppId } = await context.params;
  const access = await requireMvzRanchAccess(
    request,
    uppId,
    "mvz.ranch.vaccinations.write",
    "mvz.ranch.vaccinations"
  );
  if (!access.ok) {
    return access.response;
  }

  let body: VaccinationBody;
  try {
    body = (await request.json()) as VaccinationBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const animalId = body.animalId?.trim();
  const vaccineName = body.vaccineName?.trim();
  if (!animalId || !vaccineName) {
    return apiError("INVALID_PAYLOAD", "Debe enviar animalId y vaccineName.");
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
    .from("animal_vaccinations")
    .insert({
      tenant_id: access.upp.tenant_id,
      upp_id: uppId,
      animal_id: animalId,
      vaccine_name: vaccineName,
      dose: body.dose?.trim() || null,
      status: body.status ?? "pending",
      applied_at: body.appliedAt ?? null,
      due_at: body.dueAt ?? null,
      notes: body.notes?.trim() || null,
      applied_by_mvz_profile_id: access.mvzProfileId,
      updated_at: new Date().toISOString(),
    })
    .select(
      "id,tenant_id,upp_id,animal_id,vaccine_name,dose,status,applied_at,due_at,applied_by_mvz_profile_id,notes,created_at,updated_at"
    )
    .single();

  if (insertResult.error || !insertResult.data) {
    return apiError(
      "MVZ_RANCH_VACCINATION_CREATE_FAILED",
      insertResult.error?.message ?? "No fue posible registrar vacunacion.",
      400
    );
  }

  return apiSuccess({ vaccination: insertResult.data }, { status: 201 });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ uppId: string }> }
) {
  const { uppId } = await context.params;
  const access = await requireMvzRanchAccess(
    request,
    uppId,
    "mvz.ranch.vaccinations.write",
    "mvz.ranch.vaccinations"
  );
  if (!access.ok) {
    return access.response;
  }

  let body: VaccinationBody;
  try {
    body = (await request.json()) as VaccinationBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const id = body.id?.trim();
  if (!id) {
    return apiError("INVALID_PAYLOAD", "Debe enviar id de vacunacion.");
  }

  const lookup = await access.supabase
    .from("animal_vaccinations")
    .select("id")
    .eq("id", id)
    .eq("upp_id", uppId)
    .maybeSingle();

  if (lookup.error || !lookup.data) {
    return apiError("MVZ_RANCH_VACCINATION_NOT_FOUND", "No existe vacunacion para la UPP enviada.", 404);
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.status) {
    updatePayload.status = body.status;
  }
  if (body.dose !== undefined) {
    updatePayload.dose = body.dose?.trim() || null;
  }
  if (body.appliedAt !== undefined) {
    updatePayload.applied_at = body.appliedAt || null;
  }
  if (body.dueAt !== undefined) {
    updatePayload.due_at = body.dueAt || null;
  }
  if (body.notes !== undefined) {
    updatePayload.notes = body.notes?.trim() || null;
  }
  if (body.vaccineName !== undefined) {
    const vaccineName = body.vaccineName.trim();
    if (!vaccineName) {
      return apiError("INVALID_PAYLOAD", "vaccineName no puede ser vacio.");
    }
    updatePayload.vaccine_name = vaccineName;
  }

  const updateResult = await access.supabase
    .from("animal_vaccinations")
    .update(updatePayload)
    .eq("id", id)
    .eq("upp_id", uppId)
    .select(
      "id,tenant_id,upp_id,animal_id,vaccine_name,dose,status,applied_at,due_at,applied_by_mvz_profile_id,notes,created_at,updated_at"
    )
    .maybeSingle();

  if (updateResult.error) {
    return apiError("MVZ_RANCH_VACCINATION_UPDATE_FAILED", updateResult.error.message, 400);
  }

  if (!updateResult.data) {
    return apiError("MVZ_RANCH_VACCINATION_NOT_FOUND", "No existe vacunacion para la UPP enviada.", 404);
  }

  return apiSuccess({ vaccination: updateResult.data });
}


