import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.dashboard.read"],
    resource: "producer.dashboard",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const tenantId = auth.context.user.tenantId;
  const supabaseAdmin = getSupabaseAdminClient();
  const [dashboardResult, uppsResult] = await Promise.all([
    supabaseAdmin
      .from("v_producer_dashboard")
      .select(
        "total_upps,active_animals,exports_pending,exports_approved_this_month,movements_pending,positive_tests_90d"
      )
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
    });
  }

  const dashboard = dashboardResult.data;
  const capacity = (uppsResult.data ?? []).reduce((sum, upp) => sum + (upp.herd_limit ?? 0), 0);

  return apiSuccess({
    kpis: {
      totalHeads: dashboard?.active_animals ?? 0,
      capacity,
      exportReady: dashboard?.exports_approved_this_month ?? 0,
      activeAlerts: (dashboard?.movements_pending ?? 0) + (dashboard?.positive_tests_90d ?? 0),
    },
  });
}
