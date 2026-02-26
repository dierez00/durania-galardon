import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { createSupabaseRlsServerClient } from "@/server/auth/supabase";
import { resolveMvzProfileId } from "@/server/authz/profiles";
import { logAuditEvent } from "@/server/audit";

interface MvzProfileBody {
  fullName?: string;
  licenseNumber?: string;
  status?: "active" | "inactive";
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government", "mvz_internal"],
    permissions: ["mvz.dashboard.read"],
    resource: "mvz.profile",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const mvzProfileId = await resolveMvzProfileId(auth.context.user);
  if (!mvzProfileId) {
    return apiError("MVZ_PROFILE_NOT_FOUND", "No existe perfil MVZ activo asociado al usuario.", 404);
  }

  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);
  const [profileResult, mvzResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,email,status,created_at")
      .eq("id", auth.context.user.id)
      .maybeSingle(),
    supabase
      .from("mvz_profiles")
      .select("id,user_id,full_name,license_number,status,created_at")
      .eq("tenant_id", auth.context.user.tenantId)
      .eq("id", mvzProfileId)
      .maybeSingle(),
  ]);

  if (profileResult.error || !profileResult.data || mvzResult.error || !mvzResult.data) {
    return apiError("MVZ_PROFILE_QUERY_FAILED", "No fue posible consultar el perfil MVZ.", 500, {
      profile: profileResult.error?.message,
      mvz: mvzResult.error?.message,
    });
  }

  return apiSuccess({
    profile: profileResult.data,
    mvzProfile: mvzResult.data,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["mvz_government", "mvz_internal"],
    permissions: ["mvz.dashboard.read"],
    resource: "mvz.profile",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const mvzProfileId = await resolveMvzProfileId(auth.context.user);
  if (!mvzProfileId) {
    return apiError("MVZ_PROFILE_NOT_FOUND", "No existe perfil MVZ activo asociado al usuario.", 404);
  }

  let body: MvzProfileBody;
  try {
    body = (await request.json()) as MvzProfileBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const updatePayload: Record<string, unknown> = {};
  if (body.fullName?.trim()) {
    updatePayload.full_name = body.fullName.trim();
  }
  if (body.licenseNumber?.trim()) {
    updatePayload.license_number = body.licenseNumber.trim();
  }
  if (body.status) {
    updatePayload.status = body.status;
  }

  if (Object.keys(updatePayload).length === 0) {
    return apiError("INVALID_PAYLOAD", "Debe enviar al menos un campo para actualizar.");
  }

  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);
  const updateResult = await supabase
    .from("mvz_profiles")
    .update(updatePayload)
    .eq("tenant_id", auth.context.user.tenantId)
    .eq("id", mvzProfileId)
    .select("id,user_id,full_name,license_number,status,created_at")
    .maybeSingle();

  if (updateResult.error || !updateResult.data) {
    return apiError(
      "MVZ_PROFILE_UPDATE_FAILED",
      updateResult.error?.message ?? "No fue posible actualizar perfil MVZ.",
      400
    );
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: body.status ? "status_change" : "update",
    resource: "mvz.profile",
    resourceId: mvzProfileId,
    payload: updatePayload,
  });

  return apiSuccess({ mvzProfile: updateResult.data });
}
