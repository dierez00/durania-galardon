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
  const accessibleUppIds = await auth.context.getAccessibleUppIds();

  if (accessibleUppIds.length === 0) {
    return apiSuccess({
      kpis: {
        totalHeads: 0,
        capacity: 0,
        exportReady: 0,
        activeAlerts: 0,
      },
    });
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const [animalsResult, uppsResult, exportsResult, notificationsResult] = await Promise.all([
    supabaseAdmin
      .from("animals")
      .select("id,status")
      .eq("tenant_id", tenantId)
      .in("upp_id", accessibleUppIds),
    supabaseAdmin
      .from("upps")
      .select("id,herd_limit")
      .eq("tenant_id", tenantId)
      .in("id", accessibleUppIds),
    supabaseAdmin
      .from("export_requests")
      .select("id,status")
      .eq("tenant_id", tenantId)
      .in("upp_id", accessibleUppIds),
    supabaseAdmin
      .from("notification_events")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("user_id", auth.context.user.id)
      .eq("is_read", false),
  ]);

  if (animalsResult.error || uppsResult.error || exportsResult.error || notificationsResult.error) {
    return apiError("PRODUCER_DASHBOARD_QUERY_FAILED", "No fue posible cargar dashboard ejecutivo.", 500, {
      animals: animalsResult.error?.message,
      upps: uppsResult.error?.message,
      exports: exportsResult.error?.message,
      notifications: notificationsResult.error?.message,
    });
  }

  const animals = animalsResult.data ?? [];
  const upps = uppsResult.data ?? [];
  const exportRows = exportsResult.data ?? [];

  const capacity = upps.reduce((sum, upp) => sum + (upp.herd_limit ?? 0), 0);

  return apiSuccess({
    kpis: {
      totalHeads: animals.length,
      capacity,
      exportReady: exportRows.filter((row) => row.status === "mvz_validated" || row.status === "final_approved").length,
      activeAlerts: (notificationsResult.data ?? []).length,
    },
  });
}
