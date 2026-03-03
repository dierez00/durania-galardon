import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.producers.read"],
    resource: "admin.producers",
  });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const url = new URL(request.url);
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  const supabaseAdmin = getSupabaseProvisioningClient();

  // Get UPPs belonging to this producer
  const uppIdsResult = await supabaseAdmin
    .from("upps")
    .select("id")
    .eq("producer_id", id);

  if (uppIdsResult.error) {
    return apiError("ADMIN_PRODUCER_UPPS_QUERY_FAILED", uppIdsResult.error.message, 500);
  }

  if ((uppIdsResult.data ?? []).length === 0) {
    return apiSuccess({ visits: [], total: 0, page, limit });
  }

  const uppIds = (uppIdsResult.data ?? []).map((u) => u.id);

  type VisitRow = {
    id: string;
    upp_id: string;
    mvz_profile_id: string;
    visit_type: string;
    status: string;
    scheduled_at: string;
    finished_at: string | null;
    created_at: string;
    upps: { name: string }[] | null;
    mvz_profiles: { full_name: string; license_number: string }[] | null;
  };

  const visitsResult = await supabaseAdmin
    .from("mvz_visits")
    .select(
      "id,upp_id,mvz_profile_id,visit_type,status,scheduled_at,finished_at,created_at,upps(name),mvz_profiles(full_name,license_number)",
      { count: "exact" }
    )
    .in("upp_id", uppIds)
    .order("scheduled_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (visitsResult.error) {
    return apiError("ADMIN_PRODUCER_VISITS_QUERY_FAILED", visitsResult.error.message, 500);
  }

  const visits = (visitsResult.data as VisitRow[] ?? []).map((v) => ({
    id: v.id,
    uppId: v.upp_id,
    uppName: v.upps?.[0]?.name ?? "—",
    mvzFullName: v.mvz_profiles?.[0]?.full_name ?? "—",
    mvzLicense: v.mvz_profiles?.[0]?.license_number ?? "—",
    visitType: v.visit_type,
    status: v.status,
    scheduledAt: v.scheduled_at,
    finishedAt: v.finished_at,
  }));

  return apiSuccess({
    visits,
    total: visitsResult.count ?? 0,
    page,
    limit,
  });
}
