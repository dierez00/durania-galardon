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

  // Verify the parent animal belongs to this tenant
  const parentCheck = await supabaseAdmin
    .from("animals")
    .select("id,upp_id,tenant_id")
    .eq("id", id)
    .eq("tenant_id", auth.context.user.tenantId)
    .single();

  if (parentCheck.error || !parentCheck.data) {
    return apiError("NOT_FOUND", "Bovino no encontrado.", 404);
  }

  const parent = parentCheck.data as { id: string; upp_id: string; tenant_id: string };

  const canAccess = await auth.context.canAccessUpp(parent.upp_id);
  if (!canAccess) {
    return apiError("FORBIDDEN", "No tiene acceso a este bovino.", 403);
  }

  // Get offspring from v_animals_sanitary
  const result = await supabaseAdmin
    .from("v_animals_sanitary")
    .select(
      "animal_id,upp_id,upp_name,upp_code,siniiga_tag,sex,birth_date,animal_status,mother_animal_id,tb_date,tb_result,tb_valid_until,tb_status,br_date,br_result,br_valid_until,br_status,sanitary_alert"
    )
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("mother_animal_id", id)
    .order("birth_date", { ascending: false });

  if (result.error) {
    return apiError("OFFSPRING_QUERY_FAILED", result.error.message, 500);
  }

  // Get upp_status for parent UPP
  const uppResult = await supabaseAdmin
    .from("upps")
    .select("id,status")
    .eq("id", parent.upp_id)
    .single();
  const uppStatus = (uppResult.data as { id: string; status: string } | null)?.status ?? "active";

  const offspring = (result.data ?? []).map((row: {
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
  }) => ({
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
  }));

  return apiSuccess({ offspring });
}
