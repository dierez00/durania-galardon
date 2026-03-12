import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.bovinos.read"],
    resource: "producer.bovinos",
  });
  if (!auth.ok) return auth.response;

  const supabaseAdmin = getSupabaseAdminClient();

  // Get animal + sanitary info
  const animalResult = await supabaseAdmin
    .from("v_animals_sanitary")
    .select(
      "animal_id,upp_id,upp_name,upp_code,siniiga_tag,sex,birth_date,animal_status,mother_animal_id,tb_date,tb_result,tb_valid_until,tb_status,br_date,br_result,br_valid_until,br_status,sanitary_alert"
    )
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("animal_id", id)
    .single();

  if (animalResult.error || !animalResult.data) {
    return apiError("NOT_FOUND", "Bovino no encontrado.", 404);
  }

  const row = animalResult.data as {
    animal_id: string;
    upp_id: string;
    upp_name: string;
    upp_code: string | null;
    siniiga_tag: string;
    sex: "M" | "F";
    birth_date: string | null;
    animal_status: string;
    mother_animal_id: string | null;
    tb_date: string | null;
    tb_result: string | null;
    tb_valid_until: string | null;
    tb_status: string | null;
    br_date: string | null;
    br_result: string | null;
    br_valid_until: string | null;
    br_status: string | null;
    sanitary_alert: string | null;
  };

  // Validate tenant UPP access
  const canAccess = await auth.context.canAccessUpp(row.upp_id);
  if (!canAccess) {
    return apiError("FORBIDDEN", "No tiene acceso a este bovino.", 403);
  }

  // Get upp status
  const uppResult = await supabaseAdmin
    .from("upps")
    .select("status")
    .eq("id", row.upp_id)
    .single();

  const uppStatus = (uppResult.data as { status: string } | null)?.status ?? "active";

  return apiSuccess({
    bovino: {
      id: row.animal_id,
      upp_id: row.upp_id,
      upp_name: row.upp_name,
      upp_code: row.upp_code,
      upp_status: uppStatus,
      siniiga_tag: row.siniiga_tag,
      sex: row.sex,
      birth_date: row.birth_date,
      status: row.animal_status,
      mother_animal_id: row.mother_animal_id,
      sanitary: {
        tb_date: row.tb_date,
        tb_result: row.tb_result,
        tb_valid_until: row.tb_valid_until,
        tb_status: row.tb_status,
        br_date: row.br_date,
        br_result: row.br_result,
        br_valid_until: row.br_valid_until,
        br_status: row.br_status,
        alert: row.sanitary_alert,
      },
    },
  });
}
