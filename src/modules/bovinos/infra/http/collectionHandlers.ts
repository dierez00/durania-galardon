import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import {
  createSupabaseRlsServerClient,
} from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";
import { ListBovinos } from "@/modules/bovinos/application/use-cases/listBovinos";
import { ServerBovinoRepository } from "@/modules/bovinos/infra/supabase/ServerBovinoRepository";
import { toApiBovino } from "@/modules/bovinos/infra/http/shared";

interface ProducerBovinoBody {
  uppId?: string;
  siniigaTag?: string;
  name?: string;
  breed?: string;
  sex?: "M" | "F";
  birthDate?: string;
  ageYears?: number;
  weightKg?: number;
  healthStatus?: "healthy" | "observation" | "quarantine";
  lastVaccineAt?: string;
  motherAnimalId?: string;
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.bovinos.read"],
    resource: "producer.bovinos",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const uppId = new URL(request.url).searchParams.get("uppId")?.trim();
  if (uppId) {
    const canAccess = await auth.context.canAccessUpp(uppId);
    if (!canAccess) {
      return apiError("FORBIDDEN", "No tiene acceso a la UPP solicitada.", 403);
    }
  }

  const accessibleUppIds = uppId ? [uppId] : await auth.context.getAccessibleUppIds();
  const repository = new ServerBovinoRepository(auth.context.user.tenantId, accessibleUppIds);
  const useCase = new ListBovinos(repository);

  try {
    const bovinos = await useCase.execute();
    return apiSuccess({ bovinos: bovinos.map(toApiBovino) });
  } catch (error) {
    return apiError(
      "PRODUCER_BOVINOS_QUERY_FAILED",
      error instanceof Error ? error.message : "No fue posible cargar bovinos.",
      500
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.bovinos.write"],
    resource: "producer.bovinos",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: ProducerBovinoBody;
  try {
    body = (await request.json()) as ProducerBovinoBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const uppId = body.uppId?.trim();
  const siniigaTag = body.siniigaTag?.trim();
  const name = body.name?.trim() || null;
  const breed = body.breed?.trim() || null;
  const sex = body.sex;
  const ageYears = typeof body.ageYears === "number" ? body.ageYears : null;
  const weightKg = typeof body.weightKg === "number" ? body.weightKg : null;
  const healthStatus = body.healthStatus ?? null;
  const lastVaccineAt = body.lastVaccineAt?.trim() || null;

  if (!uppId || !siniigaTag || !sex) {
    return apiError("INVALID_PAYLOAD", "Debe enviar uppId, siniigaTag y sex.");
  }

  if (ageYears !== null && (!Number.isInteger(ageYears) || ageYears < 0)) {
    return apiError("INVALID_PAYLOAD", "Debe enviar ageYears como entero mayor o igual a 0.");
  }

  if (weightKg !== null && (!Number.isFinite(weightKg) || weightKg < 0)) {
    return apiError("INVALID_PAYLOAD", "Debe enviar weightKg como numero mayor o igual a 0.");
  }

  if (
    healthStatus !== null &&
    !["healthy", "observation", "quarantine"].includes(healthStatus)
  ) {
    return apiError(
      "INVALID_PAYLOAD",
      "Debe enviar healthStatus valido: healthy, observation o quarantine."
    );
  }

  const canAccess = await auth.context.canAccessUpp(uppId);
  if (!canAccess) {
    return apiError("FORBIDDEN", "No tiene acceso a la UPP solicitada.", 403);
  }

  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);
  const createResult = await supabase
    .from("animals")
    .insert({
      tenant_id: auth.context.user.tenantId,
      upp_id: uppId,
      siniiga_tag: siniigaTag,
      name,
      sex,
      birth_date: body.birthDate ?? null,
      breed,
      weight_kg: weightKg,
      age_years: ageYears,
      health_status: healthStatus,
      last_vaccine_at: lastVaccineAt,
      status: "active",
      mother_animal_id: body.motherAnimalId?.trim() || null,
    })
    .select(
      "id,upp_id,siniiga_tag,name,sex,birth_date,breed,weight_kg,age_years,health_status,last_vaccine_at,status,mother_animal_id,created_at"
    )
    .single();

  if (createResult.error || !createResult.data) {
    return apiError(
      "PRODUCER_BOVINO_CREATE_FAILED",
      createResult.error?.message ?? "No fue posible registrar nacimiento/bovino.",
      400
    );
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "create",
    resource: "producer.bovinos",
    resourceId: createResult.data.id,
    payload: {
      uppId,
      siniigaTag,
      name,
      breed,
      sex,
      ageYears,
      weightKg,
      healthStatus,
      lastVaccineAt,
    },
  });

  return apiSuccess({ bovino: createResult.data }, { status: 201 });
}
