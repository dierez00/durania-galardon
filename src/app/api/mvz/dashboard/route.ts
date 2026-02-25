import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { resolveMvzProfileId } from "@/server/authz/profiles";

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
  const tenantId = user.tenantId;
  const supabaseAdmin = getSupabaseAdminClient();
  const accessibleUppIds = await auth.context.getAccessibleUppIds();

  if (accessibleUppIds.length === 0) {
    return apiSuccess({
      kpis: {
        pendingTests: 0,
        activeReactors: 0,
        activeQuarantines: 0,
        assignedRouteUpps: 0,
      },
    });
  }

  const mvzProfileId = await resolveMvzProfileId(user);
  if (!mvzProfileId) {
    return apiError("MVZ_PROFILE_NOT_FOUND", "No existe perfil MVZ activo para el usuario.", 403);
  }

  const [testsResult, quarantinesResult, assignmentsResult] = await Promise.all([
    supabaseAdmin
      .from("field_tests")
      .select("id,result")
      .eq("tenant_id", tenantId)
      .in("upp_id", accessibleUppIds),
    supabaseAdmin
      .from("state_quarantines")
      .select("id")
      .eq("tenant_id", tenantId)
      .in("upp_id", accessibleUppIds)
      .eq("status", "active"),
    supabaseAdmin
      .from("mvz_upp_assignments")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("mvz_profile_id", mvzProfileId)
      .eq("status", "active"),
  ]);

  if (testsResult.error || quarantinesResult.error || assignmentsResult.error) {
    return apiError("MVZ_DASHBOARD_QUERY_FAILED", "No fue posible cargar dashboard clinico.", 500, {
      tests: testsResult.error?.message,
      quarantines: quarantinesResult.error?.message,
      assignments: assignmentsResult.error?.message,
    });
  }

  const tests = testsResult.data ?? [];
  return apiSuccess({
    kpis: {
      pendingTests: tests.filter((row) => row.result === "inconclusive").length,
      activeReactors: tests.filter((row) => row.result === "positive").length,
      activeQuarantines: (quarantinesResult.data ?? []).length,
      assignedRouteUpps: (assignmentsResult.data ?? []).length,
    },
  });
}
