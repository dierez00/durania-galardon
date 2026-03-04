// ─── CLEAN ROUTE — duplicate POST + old PATCH removed to [id]/route.ts ────────
import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";

interface QuarantineBody {
  uppId?: string;
  title?: string;
  reason?: string;
  quarantineType?: "state" | "operational";
  geojson?: Record<string, unknown>;
  epidemiologicalNote?: string;
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.quarantines.read"],
    resource: "admin.quarantines",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const search   = searchParams.get("search")?.trim() ?? "";
  const status   = searchParams.get("status") ?? "";
  const qType    = searchParams.get("quarantineType") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo   = searchParams.get("dateTo") ?? "";
  const page     = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10));
  const limit    = Math.min(100, Math.max(1, Number.parseInt(searchParams.get("limit") ?? "20", 10)));
  const sortBy   = searchParams.get("sortBy") ?? "created_at";
  const sortDir  = searchParams.get("sortDir") === "asc";

  const supabase = getSupabaseProvisioningClient();

  let query = supabase
    .from("state_quarantines")
    .select(
      "id,upp_id,status,quarantine_type,title,reason,started_at,released_at,created_at,upps(id,upp_code,name,address_text,producers(full_name))",
      { count: "exact" }
    )
    .eq("declared_by_tenant_id", auth.context.user.tenantId)
    .order(sortBy, { ascending: sortDir })
    .range((page - 1) * limit, page * limit - 1);

  if (search)
    query = query.or(`title.ilike.%${search}%`);
  if (status)
    query = query.eq("status", status);
  if (qType)
    query = query.eq("quarantine_type", qType);
  if (dateFrom)
    query = query.gte("started_at", dateFrom);
  if (dateTo)
    query = query.lte("started_at", `${dateTo}T23:59:59`);

  const { data, error, count } = await query;

  if (error) {
    return apiError("ADMIN_QUARANTINES_QUERY_FAILED", error.message, 500);
  }

  type Row = {
    id: string; upp_id: string | null; status: string; quarantine_type: string;
    title: string; reason: string | null; started_at: string; released_at: string | null;
    created_at: string;
    upps: { id: string; upp_code: string | null; name: string; address_text: string | null;
      producers: { full_name: string } | null } | null;
  };

  const quarantines = (data as unknown as Row[]).map((r) => ({
    id: r.id,
    title: r.title,
    uppId: r.upp_id,
    uppName: r.upps?.name ?? null,
    producerName: r.upps?.producers?.full_name ?? null,
    status: r.status,
    quarantineType: r.quarantine_type,
    startedAt: r.started_at,
    releasedAt: r.released_at,
  }));

  return apiSuccess({ quarantines, total: count ?? 0, page, limit });
}

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.quarantines.write"],
    resource: "admin.quarantines",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: QuarantineBody;
  try {
    body = (await request.json()) as QuarantineBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const title = body.title?.trim();
  if (!title) {
    return apiError("INVALID_PAYLOAD", "Debe enviar title.");
  }

  const supabase = getSupabaseProvisioningClient();
  const { data, error } = await supabase
    .from("state_quarantines")
    .insert({
      declared_by_tenant_id: auth.context.user.tenantId,
      upp_id: body.uppId?.trim() || null,
      status: "active",
      quarantine_type: body.quarantineType ?? "state",
      title,
      reason: body.reason?.trim() || null,
      geojson: body.geojson ?? null,
      epidemiological_note: body.epidemiologicalNote?.trim() || null,
      created_by_user_id: auth.context.user.id,
    })
    .select("id,upp_id,status,quarantine_type,title,reason,started_at,released_at,created_at")
    .single();

  if (error ?? !data) {
    return apiError(
      "ADMIN_QUARANTINE_CREATE_FAILED",
      error?.message ?? "No fue posible crear cuarentena.",
      400
    );
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "create",
    resource: "admin.quarantines",
    resourceId: data.id,
    payload: {
      title,
      uppId: body.uppId?.trim() || null,
      quarantineType: body.quarantineType ?? "state",
    },
  });

  return apiSuccess({ quarantine: data }, { status: 201 });
}
