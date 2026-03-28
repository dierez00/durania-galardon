import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { createSupabaseRlsServerClient, getSupabaseProvisioningClient } from "@/server/auth/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.exports.read"],
    resource: "admin.exports",
  });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const tenantId = auth.context.user.tenantId;
  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);

  const exportResult = await supabase
    .from("export_requests")
    .select("metrics_json")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .maybeSingle();

  if (exportResult.error) {
    return apiError("ADMIN_EXPORT_QUERY_FAILED", exportResult.error.message, 500);
  }
  if (!exportResult.data) {
    return apiError("ADMIN_EXPORT_NOT_FOUND", "No existe la solicitud de exportacion.", 404);
  }

  const metrics = exportResult.data.metrics_json as { animal_ids?: string[] } | null;
  const animalIds = metrics?.animal_ids ?? [];

  if (animalIds.length === 0) {
    return apiSuccess({ animals: [] });
  }

  const adminClient = getSupabaseProvisioningClient();
  const animalsResult = await adminClient
    .from("v_animals_sanitary")
    .select(
      "animal_id,siniiga_tag,name,sex,birth_date,breed,weight_kg,age_years,health_status,last_vaccine_at,animal_status,current_collar_id,current_collar_status,current_collar_linked_at,sanitary_alert,tb_date,tb_result,tb_valid_until,tb_status,br_date,br_result,br_valid_until,br_status"
    )
    .in("animal_id", animalIds)
    .order("siniiga_tag", { ascending: true });

  if (animalsResult.error) {
    return apiError("ADMIN_ANIMALS_QUERY_FAILED", animalsResult.error.message, 500);
  }

  const result = (animalsResult.data ?? []).map((animal) => ({
    id: animal.animal_id,
    siniigaTag: animal.siniiga_tag,
    name: animal.name ?? null,
    sex: animal.sex,
    birthDate: animal.birth_date ?? null,
    breed: animal.breed ?? null,
    weightKg: animal.weight_kg ?? null,
    ageYears: animal.age_years ?? null,
    healthStatus: animal.health_status ?? null,
    lastVaccineAt: animal.last_vaccine_at ?? null,
    status: animal.animal_status,
    currentCollarId: animal.current_collar_id ?? null,
    currentCollarStatus: animal.current_collar_status ?? null,
    currentCollarLinkedAt: animal.current_collar_linked_at ?? null,
    sanitaryAlert: animal.sanitary_alert ?? "sin_pruebas",
    tbLastDate: animal.tb_date ?? null,
    tbResult: animal.tb_result ?? null,
    tbValidUntil: animal.tb_valid_until ?? null,
    tbStatus: animal.tb_status ?? null,
    brLastDate: animal.br_date ?? null,
    brResult: animal.br_result ?? null,
    brValidUntil: animal.br_valid_until ?? null,
    brStatus: animal.br_status ?? null,
  }));

  return apiSuccess({ animals: result });
}
