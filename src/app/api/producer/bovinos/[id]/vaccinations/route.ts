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

  const animalCheck = await supabaseAdmin
    .from("animals")
    .select("id,upp_id,tenant_id")
    .eq("id", id)
    .eq("tenant_id", auth.context.user.tenantId)
    .single();

  if (animalCheck.error || !animalCheck.data) {
    return apiError("NOT_FOUND", "Bovino no encontrado.", 404);
  }

  const animal = animalCheck.data as { id: string; upp_id: string; tenant_id: string };

  const canAccess = await auth.context.canAccessUpp(animal.upp_id);
  if (!canAccess) {
    return apiError("FORBIDDEN", "No tiene acceso a este bovino.", 403);
  }

  const result = await supabaseAdmin
    .from("animal_vaccinations")
    .select(
      "id,animal_id,vaccine_name,dose,status,applied_at,due_at,notes,created_at,mvz_profiles(full_name)"
    )
    .eq("animal_id", id)
    .eq("tenant_id", auth.context.user.tenantId)
    .order("created_at", { ascending: false });

  if (result.error) {
    return apiError("VACCINATIONS_QUERY_FAILED", result.error.message, 500);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vaccinations = (result.data ?? []).map((row: any) => ({
    id: row.id,
    animal_id: row.animal_id,
    vaccine_name: row.vaccine_name,
    dose: row.dose,
    status: row.status,
    applied_at: row.applied_at,
    due_at: row.due_at,
    mvz_name: (Array.isArray(row.mvz_profiles) ? row.mvz_profiles[0] : row.mvz_profiles)?.full_name ?? null,
    notes: row.notes,
    created_at: row.created_at,
  }));

  return apiSuccess({ vaccinations });
}
