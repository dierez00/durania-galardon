import { apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { createSupabaseRlsServerClient } from "@/server/auth/supabase";

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.dashboard.read"],
    resource: "producer.dashboard",
  });
  if (!auth.ok) return auth.response;

  const tenantId = auth.context.user.tenantId;
  const url = new URL(request.url);
  const uppId = url.searchParams.get("uppId") ?? null;

  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);

  // Count queries — always scoped to tenant, optionally to a single UPP
  let animalsActiveQ = supabase
    .from("animals")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "active");

  let animalsTransitQ = supabase
    .from("animals")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "in_transit");

  let movementsQ = supabase
    .from("movement_requests")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "requested");

  let exportsQ = supabase
    .from("export_requests")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .in("status", ["requested", "mvz_validated"]);

  if (uppId) {
    animalsActiveQ = animalsActiveQ.eq("upp_id", uppId);
    animalsTransitQ = animalsTransitQ.eq("upp_id", uppId);
    movementsQ = movementsQ.eq("upp_id", uppId);
    exportsQ = exportsQ.eq("upp_id", uppId);
  }

  // Documents are at producer level — no UPP filter
  const docsQ = supabase
    .from("producer_documents")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("status", "pending");

  // Upps always tenant-wide
  const uppsQ = supabase
    .from("upps")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  const [uppsRes, animalsActiveRes, animalsTransitRes, movementsRes, exportsRes, docsRes] =
    await Promise.all([uppsQ, animalsActiveQ, animalsTransitQ, movementsQ, exportsQ, docsQ]);

  // Quarantines linked to UPPs of this tenant
  let quarantineCount = 0;
  const accessibleUppIds = await auth.context.getAccessibleUppIds();
  if (accessibleUppIds.length > 0) {
    const scopedUppIds = uppId ? [uppId] : accessibleUppIds;
    const quarantinesRes = await supabase
      .from("state_quarantines")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .in("upp_id", scopedUppIds);
    quarantineCount = quarantinesRes.count ?? 0;
  }

  return apiSuccess({
    kpis: {
      totalUpps: uppsRes.count ?? 0,
      totalAnimals: animalsActiveRes.count ?? 0,
      bovinosInTransit: animalsTransitRes.count ?? 0,
      activeMovements: movementsRes.count ?? 0,
      activeExports: exportsRes.count ?? 0,
      pendingDocuments: docsRes.count ?? 0,
      activeQuarantines: quarantineCount,
    },
  });
}
