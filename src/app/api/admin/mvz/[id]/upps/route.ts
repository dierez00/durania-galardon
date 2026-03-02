import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";

// ─── GET /api/admin/mvz/[id]/upps ─────────────────────────────────────────────
// ?mode=available  → UPPs with no active assignment to any MVZ
// (default)        → UPPs assigned (active) to this MVZ
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.mvz.read"],
    resource: "admin.mvz",
  });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const supabaseAdmin = getSupabaseProvisioningClient();

  // ── Available UPPs branch ─────────────────────────────────────────────────
  if (mode === "available") {
    // 1) Find all upp_ids that already have an ACTIVE assignment (any MVZ)
    const taken = await supabaseAdmin
      .from("mvz_upp_assignments")
      .select("upp_id")
      .eq("status", "active");

    if (taken.error) {
      return apiError("ADMIN_MVZ_UPPS_AVAILABLE_QUERY_FAILED", taken.error.message, 500);
    }

    const takenIds = (taken.data ?? []).map((r) => r.upp_id as string);

    // 2) Query active upps not in takenIds
    type UppRow = {
      id: string;
      upp_code: string | null;
      name: string;
      address_text: string | null;
      producers: { full_name: string } | null;
    };

    let query = supabaseAdmin
      .from("upps")
      .select("id,upp_code,name,address_text,producers(full_name)")
      .eq("status", "active")
      .order("name", { ascending: true });

    if (takenIds.length > 0) {
      query = query.not("id", "in", `(${takenIds.join(",")})`);
    }

    const uppsResult = await query;
    if (uppsResult.error) {
      return apiError("ADMIN_MVZ_UPPS_AVAILABLE_QUERY_FAILED", uppsResult.error.message, 500);
    }

    const uppRows = (uppsResult.data ?? []) as unknown as UppRow[];

    if (uppRows.length === 0) {
      return apiSuccess({ upps: [] });
    }

    // 3) Count animals per UPP
    const uppIds = uppRows.map((r) => r.id);
    const animalsResult = await supabaseAdmin
      .from("animals")
      .select("upp_id")
      .in("upp_id", uppIds)
      .eq("status", "active");

    const animalCountByUpp: Record<string, number> = {};
    for (const animal of animalsResult.data ?? []) {
      animalCountByUpp[animal.upp_id as string] =
        (animalCountByUpp[animal.upp_id as string] ?? 0) + 1;
    }

    const upps = uppRows.map((r) => ({
      id: r.id,
      uppCode: r.upp_code,
      name: r.name,
      addressText: r.address_text,
      animalCount: animalCountByUpp[r.id] ?? 0,
      producerName: r.producers?.full_name ?? "—",
    }));

    return apiSuccess({ upps });
  }

  // ── Assigned UPPs (default) ───────────────────────────────────────────────
  type AssignmentRow = {
    id: string;
    upp_id: string;
    status: string;
    assigned_at: string;
    upps: {
      id: string;
      upp_code: string | null;
      name: string;
      address_text: string | null;
      status: string;
      producer_id: string;
      producers: { full_name: string } | null;
    } | null;
  };

  const assignmentsResult = await supabaseAdmin
    .from("mvz_upp_assignments")
    .select(
      "id,upp_id,status,assigned_at,upps(id,upp_code,name,address_text,status,producer_id,producers(full_name))"
    )
    .eq("mvz_profile_id", id)
    .order("assigned_at", { ascending: true });

  if (assignmentsResult.error) {
    return apiError("ADMIN_MVZ_UPPS_QUERY_FAILED", assignmentsResult.error.message, 500);
  }

  const rows = (assignmentsResult.data ?? []) as unknown as AssignmentRow[];

  if (rows.length === 0) {
    return apiSuccess({ upps: [] });
  }

  const uppIds = rows.map((r) => r.upp_id).filter(Boolean);

  const animalsResult = await supabaseAdmin
    .from("animals")
    .select("upp_id")
    .in("upp_id", uppIds)
    .eq("status", "active");

  const animalCountByUpp: Record<string, number> = {};
  for (const animal of animalsResult.data ?? []) {
    animalCountByUpp[animal.upp_id as string] =
      (animalCountByUpp[animal.upp_id as string] ?? 0) + 1;
  }

  const upps = rows
    .filter((r) => r.upps !== null)
    .map((r) => ({
      id: r.upps!.id,
      uppCode: r.upps!.upp_code,
      name: r.upps!.name,
      addressText: r.upps!.address_text,
      status: r.upps!.status,
      animalCount: animalCountByUpp[r.upp_id] ?? 0,
      producerName: r.upps!.producers?.full_name ?? "—",
    }));

  return apiSuccess({ upps });
}

// ─── POST /api/admin/mvz/[id]/upps ─────────────────────────────────────────────
// Body: { uppId: string }
// UPSERT assignment; if re-assigning an inactive row it is re-activated.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.mvz.write"],
    resource: "admin.mvz",
  });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { uppId?: string };

  if (!body.uppId) {
    return apiError("ADMIN_MVZ_UPP_ASSIGN_MISSING_UPP", "uppId is required", 400);
  }

  const supabaseAdmin = getSupabaseProvisioningClient();
  const adminUserId = auth.context.user.id;

  const { data, error } = await supabaseAdmin
    .from("mvz_upp_assignments")
    .upsert(
      {
        mvz_profile_id: id,
        upp_id: body.uppId,
        status: "active",
        assigned_by_user_id: adminUserId,
        assigned_at: new Date().toISOString(),
        unassigned_at: null,
      },
      { onConflict: "mvz_profile_id,upp_id" }
    )
    .select()
    .single();

  if (error) {
    return apiError("ADMIN_MVZ_UPP_ASSIGN_FAILED", error.message, 500);
  }

  await logAuditEvent({
    request,
    action: "create",
    resource: "mvz_upp_assignment",
    resourceId: data.id,
    payload: { mvz_profile_id: id, upp_id: body.uppId },
    user: auth.context.user,
  });

  return apiSuccess({ assignment: data });
}
