import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { createSupabaseRlsServerClient } from "@/server/auth/supabase";

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government", "mvz_internal"],
    permissions: ["mvz.dashboard.read"],
    resource: "mvz.dashboard",
  });
  if (!auth.ok) {
    return auth.response;
  }

<<<<<<< Updated upstream
  const user = auth.context.user;
  const supabaseAdmin = getSupabaseAdminClient();

  const mvzProfileId = await resolveMvzProfileId(user);
  if (!mvzProfileId) {
    return apiError("MVZ_PROFILE_NOT_FOUND", "No existe perfil MVZ activo para el usuario.", 403);
  }

  const assignmentsResult = await supabaseAdmin
    .from("v_mvz_assignments")
    .select("assignment_id,sanitary_alert,tb_last_result,br_last_result")
    .eq("mvz_profile_id", mvzProfileId);
=======
  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);
  const assignmentsResult = await supabase
    .from("v_mvz_assignments")
    .select("assignment_id,sanitary_alert,tb_last_result,br_last_result");
>>>>>>> Stashed changes

  if (assignmentsResult.error) {
    return apiError("MVZ_DASHBOARD_QUERY_FAILED", "No fue posible cargar dashboard clinico.", 500, {
      assignments: assignmentsResult.error?.message,
    });
  }

  const assignments = assignmentsResult.data ?? [];
  const activeReactors = assignments.filter(
    (row) => row.tb_last_result === "positive" || row.br_last_result === "positive"
  ).length;
  const activeQuarantines = assignments.filter((row) => row.sanitary_alert === "cuarentena").length;
  const pendingTests = assignments.filter((row) => row.sanitary_alert === "sin_pruebas").length;

  return apiSuccess({
    kpis: {
      pendingTests,
      activeReactors,
      activeQuarantines,
      assignedRouteUpps: assignments.length,
    },
  });
}
