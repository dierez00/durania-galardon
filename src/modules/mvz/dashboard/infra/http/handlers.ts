import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { resolveMvzProfileId } from "@/server/authz/profiles";
import { getSupabaseAdminClient } from "@/server/auth/supabase";

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government", "mvz_internal"],
    permissions: ["mvz.dashboard.read"],
    resource: "mvz.dashboard",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const user = auth.context.user;
  const supabaseAdmin = getSupabaseAdminClient();

  const mvzProfileId = await resolveMvzProfileId(user);
  if (!mvzProfileId) {
    return apiError("MVZ_PROFILE_NOT_FOUND", "No existe perfil MVZ activo para el usuario.", 403);
  }

  const assignmentsResult = await supabaseAdmin
    .from("v_mvz_assignments")
    .select("assignment_id,upp_id,upp_name,upp_code,producer_name,sanitary_alert,active_animals,assigned_at")
    .eq("mvz_profile_id", mvzProfileId)
    .order("assigned_at", { ascending: false });

  const kpisResult = await supabaseAdmin
    .from("v_mvz_dashboard_global")
    .select(
      "mvz_profile_id,total_assigned_upps,total_animals_registered,total_active_visits,active_sanitary_alerts,pending_vaccinations,recent_incidents"
    )
    .eq("mvz_profile_id", mvzProfileId)
    .maybeSingle();

  if (assignmentsResult.error || kpisResult.error) {
    return apiError("MVZ_DASHBOARD_QUERY_FAILED", "No fue posible cargar dashboard clinico.", 500, {
      assignments: assignmentsResult.error?.message,
      kpis: kpisResult.error?.message,
    });
  }

  const assignments = assignmentsResult.data ?? [];
  const kpis = kpisResult.data;

  return apiSuccess({
    kpisGlobales: {
      totalRanchosAsignados: kpis?.total_assigned_upps ?? assignments.length,
      totalAnimalesRegistrados: kpis?.total_animals_registered ?? 0,
      totalCitasActivas: kpis?.total_active_visits ?? 0,
      alertasSanitariasActivas: kpis?.active_sanitary_alerts ?? 0,
      vacunacionesPendientes: kpis?.pending_vaccinations ?? 0,
      incidenciasRecientes: kpis?.recent_incidents ?? 0,
    },
    ranchosAsignados: assignments,
  });
}
