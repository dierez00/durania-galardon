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

  const tenantId = auth.context.user.tenantId;
  const supabaseAdmin = getSupabaseAdminClient();

  const [uppsResult, fieldTestsResult, exportsResult, quarantinesResult] = await Promise.all([
    supabaseAdmin.from("upps").select("id,status").eq("tenant_id", tenantId),
    supabaseAdmin.from("field_tests").select("id,result").eq("tenant_id", tenantId),
    supabaseAdmin
      .from("export_requests")
      .select("id,status,monthly_bucket")
      .eq("tenant_id", tenantId)
      .order("monthly_bucket", { ascending: true }),
    supabaseAdmin
      .from("state_quarantines")
      .select("id,status")
      .eq("tenant_id", tenantId)
      .eq("status", "active"),
  ]);

  if (uppsResult.error || fieldTestsResult.error || exportsResult.error || quarantinesResult.error) {
    return apiError("ADMIN_DASHBOARD_QUERY_FAILED", "No fue posible obtener KPIs globales.", 500, {
      upps: uppsResult.error?.message,
      fieldTests: fieldTestsResult.error?.message,
      exports: exportsResult.error?.message,
      quarantines: quarantinesResult.error?.message,
    });
  }

  const upps = uppsResult.data ?? [];
  const fieldTests = fieldTestsResult.data ?? [];
  const exportRequests = exportsResult.data ?? [];
  const activeQuarantines = quarantinesResult.data ?? [];

  const exportsByMonth = exportRequests.reduce<Record<string, number>>((acc, row) => {
    const bucket = row.monthly_bucket ?? "sin-fecha";
    acc[bucket] = (acc[bucket] ?? 0) + 1;
    return acc;
  }, {});

  return apiSuccess({
    kpis: {
      totalUpps: upps.length,
      uppsActive: upps.filter((row) => row.status === "active").length,
      uppsInactive: upps.filter((row) => row.status !== "active").length,
      activeReactors: fieldTests.filter((row) => row.result === "positive").length,
      monthlyExports: exportsByMonth,
      activeQuarantines: activeQuarantines.length,
    },
  });
}
