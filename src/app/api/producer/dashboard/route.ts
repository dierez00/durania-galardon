import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { createSupabaseRlsServerClient } from "@/server/auth/supabase";

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.dashboard.read"],
    resource: "producer.dashboard",
  });
  if (!auth.ok) {
    return auth.response;
  }

<<<<<<< Updated upstream
  const tenantId = auth.context.user.tenantId;
  const supabaseAdmin = getSupabaseAdminClient();
  const [dashboardResult, uppsResult] = await Promise.all([
    supabaseAdmin
=======
  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);
  const [dashboardResult, notificationsResult] = await Promise.all([
    supabase
>>>>>>> Stashed changes
      .from("v_producer_dashboard")
      .select(
        "total_upps,active_animals,exports_pending,exports_approved_this_month,movements_pending,positive_tests_90d"
      )
<<<<<<< Updated upstream
      .eq("tenant_id", tenantId)
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from("upps")
      .select("herd_limit")
      .eq("tenant_id", tenantId),
  ]);

  if (dashboardResult.error || uppsResult.error) {
    return apiError("PRODUCER_DASHBOARD_QUERY_FAILED", "No fue posible cargar dashboard ejecutivo.", 500, {
      dashboard: dashboardResult.error?.message,
      upps: uppsResult.error?.message,
=======
      .eq("tenant_id", auth.context.user.tenantId)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("notification_events")
      .select("id")
      .eq("target_user_id", auth.context.user.id)
      .eq("is_read", false),
  ]);

  if (dashboardResult.error || notificationsResult.error) {
    return apiError("PRODUCER_DASHBOARD_QUERY_FAILED", "No fue posible cargar dashboard ejecutivo.", 500, {
      dashboard: dashboardResult.error?.message,
      notifications: notificationsResult.error?.message,
>>>>>>> Stashed changes
    });
  }

  const dashboard = dashboardResult.data;
<<<<<<< Updated upstream
  const capacity = (uppsResult.data ?? []).reduce((sum, upp) => sum + (upp.herd_limit ?? 0), 0);
=======
>>>>>>> Stashed changes

  return apiSuccess({
    kpis: {
      totalHeads: dashboard?.active_animals ?? 0,
<<<<<<< Updated upstream
      capacity,
      exportReady: dashboard?.exports_approved_this_month ?? 0,
      activeAlerts: (dashboard?.movements_pending ?? 0) + (dashboard?.positive_tests_90d ?? 0),
=======
      capacity: dashboard?.total_upps ?? 0,
      exportReady: dashboard?.exports_approved_this_month ?? 0,
      activeAlerts: (notificationsResult.data ?? []).length,
>>>>>>> Stashed changes
    },
  });
}
