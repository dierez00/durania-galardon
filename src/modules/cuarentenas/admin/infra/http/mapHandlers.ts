import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.quarantines.read"],
    resource: "admin.quarantines",
  });
  if (!auth.ok) return auth.response;

  const supabase = getSupabaseProvisioningClient();

  const { data, error } = await supabase
    .from("state_quarantines")
    .select(
      "id,title,status,quarantine_type,upps(name,upp_code,location_lat,location_lng,producers(full_name))"
    )
    .eq("declared_by_tenant_id", auth.context.user.tenantId);

  if (error) return apiError("ADMIN_QUARANTINES_MAP_FAILED", error.message, 500);

  type Row = {
    id: string; title: string; status: string; quarantine_type: string;
    upps: {
      name: string; upp_code: string | null;
      location_lat: number | null; location_lng: number | null;
      producers: { full_name: string } | null;
    } | null;
  };

  const points = (data as unknown as Row[])
    .filter((r) => r.upps?.location_lat != null && r.upps?.location_lng != null)
    .map((r) => ({
      id: r.id,
      title: r.title,
      status: r.status,
      quarantineType: r.quarantine_type,
      lat: Number(r.upps!.location_lat),
      lng: Number(r.upps!.location_lng),
      uppName: r.upps!.name ?? null,
      producerName: r.upps!.producers?.full_name ?? null,
    }));

  return apiSuccess({ points });
}
