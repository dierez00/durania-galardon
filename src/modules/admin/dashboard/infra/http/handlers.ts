import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.dashboard.read"],
    resource: "admin.dashboard",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const supabaseAdmin = getSupabaseAdminClient();

  const [producersResult, mvzResult, exportsResult, quarantinesResult] = await Promise.all([
    supabaseAdmin.from("v_producers_admin").select("producer_id,total_upps"),
    supabaseAdmin.from("v_mvz_admin").select("mvz_profile_id,active_assignments"),
    supabaseAdmin.from("export_requests").select("id,status,monthly_bucket").order("monthly_bucket", { ascending: true }),
    supabaseAdmin
      .from("state_quarantines")
      .select("id,status")
      .eq("declared_by_tenant_id", auth.context.user.tenantId)
      .eq("status", "active"),
  ]);

  if (producersResult.error || mvzResult.error || exportsResult.error || quarantinesResult.error) {
    return apiError("ADMIN_DASHBOARD_QUERY_FAILED", "No fue posible obtener KPIs globales.", 500, {
      producers: producersResult.error?.message,
      mvz: mvzResult.error?.message,
      exports: exportsResult.error?.message,
      quarantines: quarantinesResult.error?.message,
    });
  }

  const producerRows = (producersResult.data ?? []) as Array<{ total_upps: number | null }>;
  const mvzRows = (mvzResult.data ?? []) as Array<{ active_assignments: number | null }>;
  const exportRequests = (exportsResult.data ?? []) as Array<{ monthly_bucket: string | null }>;
  const activeQuarantines = quarantinesResult.data ?? [];
  const totalUpps = producerRows.reduce((sum, row) => sum + (row.total_upps ?? 0), 0);
  const activeMvzAssignments = mvzRows.reduce((sum, row) => sum + (row.active_assignments ?? 0), 0);

  const exportsByMonth = exportRequests.reduce<Record<string, number>>((acc, row) => {
    const bucket = row.monthly_bucket ?? "sin-fecha";
    acc[bucket] = (acc[bucket] ?? 0) + 1;
    return acc;
  }, {});

  return apiSuccess({
    kpis: {
      totalUpps,
      uppsActive: totalUpps,
      uppsInactive: 0,
      activeReactors: activeMvzAssignments,
      monthlyExports: exportsByMonth,
      activeQuarantines: activeQuarantines.length,
    },
  });
}
