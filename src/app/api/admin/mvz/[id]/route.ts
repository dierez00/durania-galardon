import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";
import { deleteAuthUser } from "@/server/auth/provisioning";
import { logAuditEvent } from "@/server/audit";
import { publicEnv, getServerEnv } from "@/shared/config";

interface PatchBody {
  status?: "active" | "inactive";
  fullName?: string;
  licenseNumber?: string;
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
    permissions: ["admin.mvz.read"],
    resource: "admin.mvz",
  });
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const supabaseAdmin = getSupabaseProvisioningClient();

  const mvzResult = await supabaseAdmin
    .from("mvz_profiles")
    .select("id,user_id,owner_tenant_id,full_name,license_number,status,created_at")
    .eq("id", id)
    .maybeSingle();

  if (mvzResult.error) {
    return apiError("ADMIN_MVZ_QUERY_FAILED", mvzResult.error.message, 500);
  }
  if (!mvzResult.data) {
    return apiError("ADMIN_MVZ_NOT_FOUND", "No existe MVZ con ese id.", 404);
  }

  const mvz = mvzResult.data;

  // Count total UPP assignments
  const totalUppsResult = await supabaseAdmin
    .from("mvz_upp_assignments")
    .select("id", { count: "exact", head: true })
    .eq("mvz_profile_id", id);

  // Count active UPP assignments
  const activeUppsResult = await supabaseAdmin
    .from("mvz_upp_assignments")
    .select("id", { count: "exact", head: true })
    .eq("mvz_profile_id", id)
    .eq("status", "active");

  // Count field tests
  const testsCountResult = await supabaseAdmin
    .from("field_tests")
    .select("id", { count: "exact", head: true })
    .eq("mvz_profile_id", id);

  // Count visits
  const visitsCountResult = await supabaseAdmin
    .from("mvz_visits")
    .select("id", { count: "exact", head: true })
    .eq("mvz_profile_id", id);

  // Get email from auth
  const email = mvz.user_id ? await fetchAuthEmail(mvz.user_id) : null;

  return apiSuccess({
    mvz: {
      id: mvz.id,
      fullName: mvz.full_name,
      licenseNumber: mvz.license_number,
      email,
      status: mvz.status,
      createdAt: mvz.created_at,
      totalUpps: totalUppsResult.count ?? 0,
      activeAssignments: activeUppsResult.count ?? 0,
      totalTests: testsCountResult.count ?? 0,
      totalVisits: visitsCountResult.count ?? 0,
    },
  });
}

export async function PATCH(
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

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const supabaseAdmin = getSupabaseProvisioningClient();
  const updatePayload: Record<string, unknown> = {};
  if (body.status) updatePayload.status = body.status;
  if (body.fullName?.trim()) updatePayload.full_name = body.fullName.trim();
  if (body.licenseNumber?.trim())
    updatePayload.license_number = body.licenseNumber.trim().toUpperCase();

  // Handle email change via GoTrue (requires user_id)
  if (body.email?.trim()) {
    const mvzForEmail = await supabaseAdmin
      .from("mvz_profiles")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();
    if (mvzForEmail.data?.user_id) {
      const ok = await patchAuthEmail(mvzForEmail.data.user_id, body.email.trim());
      if (!ok) {
        return apiError("ADMIN_MVZ_EMAIL_UPDATE_FAILED", "No fue posible actualizar el correo.", 400);
      }
    }
  }

  if (Object.keys(updatePayload).length === 0 && !body.email?.trim()) {
    return apiError("INVALID_PAYLOAD", "Debe enviar al menos un campo para actualizar.");
  }

  if (Object.keys(updatePayload).length > 0) {
    const updateResult = await supabaseAdmin
      .from("mvz_profiles")
      .update(updatePayload)
      .eq("id", id)
      .select("id,user_id,full_name,license_number,status,created_at")
      .maybeSingle();

    if (updateResult.error) {
      return apiError("ADMIN_MVZ_UPDATE_FAILED", updateResult.error.message, 400);
    }
    if (!updateResult.data) {
      return apiError("ADMIN_MVZ_NOT_FOUND", "No existe MVZ con ese id.", 404);
    }
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: body.status ? "status_change" : "update",
    resource: "admin.mvz",
    resourceId: id,
    payload: updatePayload,
  });

  return apiSuccess({ ok: true });
}

export async function DELETE(
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
  const supabaseAdmin = getSupabaseProvisioningClient();

  const mvzResult = await supabaseAdmin
    .from("mvz_profiles")
    .select("id,user_id")
    .eq("id", id)
    .maybeSingle();

  if (mvzResult.error || !mvzResult.data) {
    return apiError("ADMIN_MVZ_NOT_FOUND", "No existe MVZ con ese id.", 404);
  }

  // Soft-delete: set status inactive
  const updateResult = await supabaseAdmin
    .from("mvz_profiles")
    .update({ status: "inactive" })
    .eq("id", id);

  if (updateResult.error) {
    return apiError("ADMIN_MVZ_DELETE_FAILED", updateResult.error.message, 400);
  }

  // Disable auth user if exists
  if (mvzResult.data.user_id) {
    await deleteAuthUser(mvzResult.data.user_id);
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "delete",
    resource: "admin.mvz",
    resourceId: id,
    payload: {},
  });

  return apiSuccess({ ok: true });
}
