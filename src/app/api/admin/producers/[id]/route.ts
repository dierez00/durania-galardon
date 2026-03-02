import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";
import { deleteAuthUser } from "@/server/auth/provisioning";
import { logAuditEvent } from "@/server/audit";
import { publicEnv, getServerEnv } from "@/shared/config";

interface PatchBody {
  status?: "active" | "inactive";
  fullName?: string;
  curp?: string | null;
  email?: string;
}

async function fetchAuthEmail(userId: string): Promise<string | null> {
  try {
    const { supabaseServiceRoleKey } = getServerEnv();
    const url = `${publicEnv.supabaseUrl}/auth/v1/admin/users/${userId}`;
    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        apikey: supabaseServiceRoleKey,
      },
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { email?: string };
    return data.email ?? null;
  } catch {
    return null;
  }
}

async function patchAuthEmail(userId: string, email: string): Promise<boolean> {
  try {
    const { supabaseServiceRoleKey } = getServerEnv();
    const url = `${publicEnv.supabaseUrl}/auth/v1/admin/users/${userId}`;
    const resp = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        apikey: supabaseServiceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

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

  const producerResult = await supabaseAdmin
    .from("producers")
    .select(
      "id,user_id,owner_tenant_id,curp,full_name,status,created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (producerResult.error) {
    return apiError("ADMIN_PRODUCER_QUERY_FAILED", producerResult.error.message, 500);
  }
  if (!producerResult.data) {
    return apiError("ADMIN_PRODUCER_NOT_FOUND", "No existe productor con ese id.", 404);
  }

  const producer = producerResult.data;

  // Count UPPs
  const uppsCountResult = await supabaseAdmin
    .from("upps")
    .select("id", { count: "exact", head: true })
    .eq("producer_id", id);

  // Count animals via upps
  const uppIdsResult = await supabaseAdmin
    .from("upps")
    .select("id")
    .eq("producer_id", id);

  let totalBovinos = 0;
  if (!uppIdsResult.error && (uppIdsResult.data ?? []).length > 0) {
    const uppIds = (uppIdsResult.data ?? []).map((u) => u.id);
    const animalsCountResult = await supabaseAdmin
      .from("animals")
      .select("id", { count: "exact", head: true })
      .in("upp_id", uppIds)
      .eq("status", "active");
    totalBovinos = animalsCountResult.count ?? 0;
  }

  // Count documents
  const docsCountResult = await supabaseAdmin
    .from("producer_documents")
    .select("id", { count: "exact", head: true })
    .eq("producer_id", id);

  // Count visits via upps
  let totalVisits = 0;
  if (!uppIdsResult.error && (uppIdsResult.data ?? []).length > 0) {
    const uppIds = (uppIdsResult.data ?? []).map((u) => u.id);
    const visitsCountResult = await supabaseAdmin
      .from("mvz_visits")
      .select("id", { count: "exact", head: true })
      .in("upp_id", uppIds);
    totalVisits = visitsCountResult.count ?? 0;
  }

  // Get email from auth
  const email = producer.user_id
    ? await fetchAuthEmail(producer.user_id)
    : null;

  return apiSuccess({
    producer: {
      id: producer.id,
      fullName: producer.full_name,
      curp: producer.curp,
      email,
      status: producer.status,
      createdAt: producer.created_at,
      totalUpps: uppsCountResult.count ?? 0,
      totalBovinos,
      totalDocuments: docsCountResult.count ?? 0,
      totalVisits,
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.producers.write"],
    resource: "admin.producers",
  });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const updatePayload: Record<string, unknown> = {};
  if (body.status) updatePayload.status = body.status;
  if (body.fullName?.trim()) updatePayload.full_name = body.fullName.trim();
  if (body.curp !== undefined) updatePayload.curp = body.curp?.trim() || null;

  // Handle email change via GoTrue (requires user_id)
  if (body.email?.trim()) {
    const producerForEmail = await supabaseAdmin
      .from("producers")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();
    if (producerForEmail.data?.user_id) {
      await patchAuthEmail(producerForEmail.data.user_id, body.email.trim());
    }
  }

  if (Object.keys(updatePayload).length === 0 && !body.email?.trim()) {
    return apiError("INVALID_PAYLOAD", "Debe enviar al menos un campo para actualizar.");
  }

  const supabaseAdmin = getSupabaseProvisioningClient();
  const updateResult = await supabaseAdmin
    .from("producers")
    .update(updatePayload)
    .eq("id", id)
    .select("id,user_id,owner_tenant_id,curp,full_name,status,created_at")
    .maybeSingle();

  if (updateResult.error) {
    return apiError("ADMIN_PRODUCER_UPDATE_FAILED", updateResult.error.message, 400);
  }
  if (!updateResult.data) {
    return apiError("ADMIN_PRODUCER_NOT_FOUND", "No existe productor con ese id.", 404);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: body.status ? "status_change" : "update",
    resource: "admin.producers",
    resourceId: id,
    payload: updatePayload,
  });

  return apiSuccess({ producer: updateResult.data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.producers.write"],
    resource: "admin.producers",
  });
  if (!auth.ok) return auth.response;

  const { id } = await params;

  const supabaseAdmin = getSupabaseProvisioningClient();

  const producerResult = await supabaseAdmin
    .from("producers")
    .select("id,user_id")
    .eq("id", id)
    .maybeSingle();

  if (producerResult.error || !producerResult.data) {
    return apiError("ADMIN_PRODUCER_NOT_FOUND", "No existe productor con ese id.", 404);
  }

  // Soft-delete: set status inactive
  const updateResult = await supabaseAdmin
    .from("producers")
    .update({ status: "inactive" })
    .eq("id", id);

  if (updateResult.error) {
    return apiError("ADMIN_PRODUCER_DELETE_FAILED", updateResult.error.message, 400);
  }

  // Disable auth user if exists
  if (producerResult.data.user_id) {
    await deleteAuthUser(producerResult.data.user_id);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "delete",
    resource: "admin.producers",
    resourceId: id,
    payload: {},
  });

  return apiSuccess({ ok: true });
}
