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

  const supabaseAdmin = getSupabaseProvisioningClient();

  // Fetch UPPs with MVZ assignments
  const uppsResult = await supabaseAdmin
    .from("upps")
    .select(
      "id,upp_code,name,address_text,location_lat,location_lng,hectares_total,herd_limit,status,created_at"
    )
    .eq("producer_id", id)
    .order("created_at", { ascending: true });

  if (uppsResult.error) {
    return apiError("ADMIN_UPPS_QUERY_FAILED", uppsResult.error.message, 500);
  }

  const upps = uppsResult.data ?? [];

  if (upps.length === 0) {
    return apiSuccess({ upps: [] });
  }

  const uppIds = upps.map((u) => u.id);

  // Fetch animal counts per UPP
  const animalsResult = await supabaseAdmin
    .from("animals")
    .select("upp_id")
    .in("upp_id", uppIds)
    .eq("status", "active");

  const animalCountByUpp: Record<string, number> = {};
  for (const animal of animalsResult.data ?? []) {
    animalCountByUpp[animal.upp_id] = (animalCountByUpp[animal.upp_id] ?? 0) + 1;
  }

  // Fetch active MVZ assignments with mvz_profiles
  const mvzAssignmentsResult = await supabaseAdmin
    .from("mvz_upp_assignments")
    .select(
      "id,upp_id,mvz_profile_id,status,assigned_at,mvz_profiles(full_name,license_number,status)"
    )
    .in("upp_id", uppIds)
    .eq("status", "active");

  // Group MVZ assignments by upp_id
  type MvzAssignmentRow = {
    id: string;
    upp_id: string;
    mvz_profile_id: string;
    status: string;
    assigned_at: string;
    mvz_profiles: {
      full_name: string;
      license_number: string;
      status: string;
    }[] | null;
  };

  const mvzByUpp: Record<string, MvzAssignmentRow[]> = {};
  for (const row of (mvzAssignmentsResult.data ?? []) as MvzAssignmentRow[]) {
    const arr = mvzByUpp[row.upp_id] ?? [];
    arr.push(row);
    mvzByUpp[row.upp_id] = arr;
  }

  const result = upps.map((upp) => ({
    id: upp.id,
    uppCode: upp.upp_code,
    name: upp.name,
    addressText: upp.address_text,
    locationLat: upp.location_lat ? Number(upp.location_lat) : null,
    locationLng: upp.location_lng ? Number(upp.location_lng) : null,
    hectaresTotal: upp.hectares_total ? Number(upp.hectares_total) : null,
    herdLimit: upp.herd_limit,
    status: upp.status,
    createdAt: upp.created_at,
    animalCount: animalCountByUpp[upp.id] ?? 0,
    mvzAssignments: (mvzByUpp[upp.id] ?? []).map((a) => ({
      mvzProfileId: a.mvz_profile_id,
      fullName: (a.mvz_profiles?.[0])?.full_name ?? "—",
      licenseNumber: (a.mvz_profiles?.[0])?.license_number ?? "—",
      mvzStatus: (a.mvz_profiles?.[0])?.status ?? "unknown",
      status: a.status,
      assignedAt: a.assigned_at,
    })),
  }));

  return apiSuccess({ upps: result });
}
