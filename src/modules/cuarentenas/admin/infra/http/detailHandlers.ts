import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";
import { logAuditEvent } from "@/server/audit";

interface PatchBody {
  status?: "active" | "released" | "suspended";
  epidemiologicalNote?: string;
  geojson?: Record<string, unknown> | null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.quarantines.read"],
    resource: "admin.quarantines",
  });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const supabase = getSupabaseProvisioningClient();

  const { data, error } = await supabase
    .from("state_quarantines")
    .select(
      `id,title,status,quarantine_type,reason,epidemiological_note,geojson,
       started_at,released_at,created_at,created_by_user_id,released_by_user_id,
       upps(id,upp_code,name,address_text,location_lat,location_lng,
         producers(full_name),
         animals(count))`
    )
    .eq("declared_by_tenant_id", auth.context.user.tenantId)
    .eq("id", id)
    .maybeSingle();

  if (error) return apiError("ADMIN_QUARANTINE_DETAIL_FAILED", error.message, 500);
  if (!data)  return apiError("ADMIN_QUARANTINE_NOT_FOUND", "Cuarentena no encontrada.", 404);

  type Row = {
    id: string; title: string; status: string; quarantine_type: string;
    reason: string | null; epidemiological_note: string | null; geojson: Record<string, unknown> | null;
    started_at: string; released_at: string | null; created_at: string;
    created_by_user_id: string | null; released_by_user_id: string | null;
    upps: {
      id: string; upp_code: string | null; name: string; address_text: string | null;
      location_lat: number | null; location_lng: number | null;
      producers: { full_name: string } | null;
      animals: { count: number }[];
    } | null;
  };

  const r = data as unknown as Row;
  const animalCount =
    (r.upps?.animals?.[0] as unknown as { count: number } | undefined)?.count ?? 0;

  const quarantine = {
    id: r.id,
    title: r.title,
    status: r.status,
    quarantineType: r.quarantine_type,
    reason: r.reason,
    epidemiologicalNote: r.epidemiological_note,
    geojson: r.geojson,
    startedAt: r.started_at,
    releasedAt: r.released_at,
    createdAt: r.created_at,
    createdByUserId: r.created_by_user_id,
    releasedByUserId: r.released_by_user_id,
    uppId: r.upps?.id ?? null,
    uppCode: r.upps?.upp_code ?? null,
    uppName: r.upps?.name ?? null,
    addressText: r.upps?.address_text ?? null,
    locationLat: r.upps?.location_lat == null ? null : Number(r.upps.location_lat),
    locationLng: r.upps?.location_lng == null ? null : Number(r.upps.location_lng),
    producerName: r.upps?.producers?.full_name ?? null,
    animalCount,
  };

  return apiSuccess({ quarantine });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.quarantines.write"],
    resource: "admin.quarantines",
  });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON válido.");
  }

  const updatePayload: Record<string, unknown> = {};

  if (body.status) {
    updatePayload.status = body.status;
    if (body.status === "released") {
      updatePayload.released_at = new Date().toISOString();
      updatePayload.released_by_user_id = auth.context.user.id;
    }
  }
  if (Object.hasOwn(body, "epidemiologicalNote")) {
    updatePayload.epidemiological_note =
      typeof body.epidemiologicalNote === "string"
        ? body.epidemiologicalNote.trim() || null
        : null;
  }
  if (Object.hasOwn(body, "geojson")) {
    updatePayload.geojson = body.geojson ?? null;
  }

  if (Object.keys(updatePayload).length === 0) {
    return apiError("INVALID_PAYLOAD", "Debe enviar al menos un campo para actualizar.");
  }

  const supabase = getSupabaseProvisioningClient();

  const { data, error } = await supabase
    .from("state_quarantines")
    .update(updatePayload)
    .eq("declared_by_tenant_id", auth.context.user.tenantId)
    .eq("id", id)
    .select("id,status,quarantine_type,epidemiological_note,geojson,released_at")
    .maybeSingle();

  if (error) return apiError("ADMIN_QUARANTINE_UPDATE_FAILED", error.message, 400);
  if (!data)  return apiError("ADMIN_QUARANTINE_NOT_FOUND", "No existe cuarentena con ese id.", 404);

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: body.status ? "status_change" : "update",
    resource: "admin.quarantines",
    resourceId: id,
    payload: updatePayload,
  });

  return apiSuccess({ quarantine: data });
}
