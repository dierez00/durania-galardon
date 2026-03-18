import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { resolveMvzProfileId } from "@/server/authz/profiles";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { listMvzAssignmentSummaries } from "@/modules/ranchos/infra/api/mvzAssignments";

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

  const [assignmentsResult, kpisResult] = await Promise.allSettled([
    listMvzAssignmentSummaries(mvzProfileId),
    supabaseAdmin
      .from("v_mvz_dashboard_global")
      .select(
        "mvz_profile_id,total_assigned_upps,total_animals_registered,total_active_visits,active_sanitary_alerts,pending_vaccinations,recent_incidents"
      )
      .eq("mvz_profile_id", mvzProfileId)
      .maybeSingle(),
  ]);

  const assignmentsError =
    assignmentsResult.status === "rejected" ? assignmentsResult.reason : null;
  const kpisError =
    kpisResult.status === "rejected" ? kpisResult.reason : kpisResult.value.error;

  if (assignmentsError || kpisError) {
    return apiError("MVZ_DASHBOARD_QUERY_FAILED", "No fue posible cargar dashboard clinico.", 500, {
      assignments: assignmentsError instanceof Error ? assignmentsError.message : undefined,
      kpis: kpisError instanceof Error ? kpisError.message : undefined,
    });
  }

  const assignments =
    assignmentsResult.status === "fulfilled" ? assignmentsResult.value : [];
  const kpis =
    kpisResult.status === "fulfilled" ? kpisResult.value.data : null;

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
