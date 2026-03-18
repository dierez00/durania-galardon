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
  const tenantId = auth.context.user.tenantId;

  // 1. UPPs activas del tenant
  const { data: uppsData, error: uppsError } = await supabase
    .from("upps")
    .select("id,upp_code,name,address_text,location_lat,location_lng,producers(full_name)")
    .eq("tenant_id", tenantId)
    .eq("status", "active");

  if (uppsError) return apiError("ADMIN_ACTIVATION_CONTEXT_UPPS_FAILED", uppsError.message, 500);

  // 2. Conteo de animales activos por UPP del tenant
  const { data: animalsData, error: animalsError } = await supabase
    .from("animals")
    .select("upp_id,status")
    .eq("tenant_id", tenantId)
    .not("upp_id", "is", null);

  if (animalsError) return apiError("ADMIN_ACTIVATION_CONTEXT_ANIMALS_FAILED", animalsError.message, 500);

  type AnimalRow = { upp_id: string | null; status: string };
  const totalByUpp   = new Map<string, number>();
  const activeByUpp  = new Map<string, number>();
  for (const a of (animalsData as unknown as AnimalRow[])) {
    if (!a.upp_id) continue;
    totalByUpp.set(a.upp_id, (totalByUpp.get(a.upp_id) ?? 0) + 1);
    if (a.status === "active") {
      activeByUpp.set(a.upp_id, (activeByUpp.get(a.upp_id) ?? 0) + 1);
    }
  }

  // 3. Cuarentenas activas por UPP del tenant
  const { data: quarantinesData, error: quarantinesError } = await supabase
    .from("state_quarantines")
    .select("upp_id,title")
    .eq("declared_by_tenant_id", tenantId)
    .eq("status", "active")
    .not("upp_id", "is", null);

  if (quarantinesError) return apiError("ADMIN_ACTIVATION_CONTEXT_QR_FAILED", quarantinesError.message, 500);

  type QRow = { upp_id: string | null; title: string };
  const activeQuarantineByUpp = new Map<string, string>();
  for (const q of (quarantinesData as unknown as QRow[])) {
    if (q.upp_id && !activeQuarantineByUpp.has(q.upp_id)) {
      activeQuarantineByUpp.set(q.upp_id, q.title);
    }
  }

  // 4. Combinar
  type UppRow = {
    id: string; upp_code: string | null; name: string; address_text: string | null;
    location_lat: number | null; location_lng: number | null;
    producers: { full_name: string } | null;
  };

  const upps = (uppsData as unknown as UppRow[]).map((u) => ({
    uppId: u.id,
    uppCode: u.upp_code ?? null,
    uppName: u.name,
    addressText: u.address_text ?? null,
    locationLat: u.location_lat === null ? null : Number(u.location_lat),
    locationLng: u.location_lng === null ? null : Number(u.location_lng),
    producerName: u.producers?.full_name ?? "",
    totalAnimals: totalByUpp.get(u.id) ?? 0,
    activeAnimals: activeByUpp.get(u.id) ?? 0,
    hasActiveQuarantine: activeQuarantineByUpp.has(u.id),
    activeQuarantineTitle: activeQuarantineByUpp.get(u.id) ?? null,
  }));

  return apiSuccess({ upps });
}
