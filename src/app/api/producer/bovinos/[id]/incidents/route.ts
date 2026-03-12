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
    .from("sanitary_incidents")
    .select(
      "id,animal_id,incident_type,severity,status,detected_at,resolved_at,description,resolution_notes,created_at,mvz_profiles(full_name)"
    )
    .eq("animal_id", id)
    .eq("tenant_id", auth.context.user.tenantId)
    .order("detected_at", { ascending: false });

  if (result.error) {
    return apiError("INCIDENTS_QUERY_FAILED", result.error.message, 500);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const incidents = (result.data ?? []).map((row: any) => ({
    id: row.id,
    animal_id: row.animal_id,
    incident_type: row.incident_type,
    severity: row.severity,
    status: row.status,
    detected_at: row.detected_at,
    resolved_at: row.resolved_at,
    description: row.description,
    resolution_notes: row.resolution_notes,
    mvz_name: (Array.isArray(row.mvz_profiles) ? row.mvz_profiles[0] : row.mvz_profiles)?.full_name ?? null,
    created_at: row.created_at,
  }));

  return apiSuccess({ incidents });
}
