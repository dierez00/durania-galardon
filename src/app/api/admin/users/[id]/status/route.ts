import { resolveAuthenticatedRequestUser } from "@/server/auth";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { apiError, apiSuccess } from "@/shared/lib/api-response";

interface UpdateStatusBody {
  status?: "active" | "inactive";
}

const VALID_STATUS = new Set(["active", "inactive"]);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await resolveAuthenticatedRequestUser(request);
  if ("error" in authResult) {
    return apiError(authResult.error.code, authResult.error.message, authResult.error.status);
  }

  if (authResult.user.role !== "admin") {
    return apiError("FORBIDDEN", "Solo administradores pueden actualizar estado de usuarios.", 403);
  }

  const { id } = await context.params;
  if (!id) {
    return apiError("INVALID_ID", "Debe indicar id de usuario.");
  }

  let body: UpdateStatusBody;
  try {
    body = (await request.json()) as UpdateStatusBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const status = body.status;
  if (!status || !VALID_STATUS.has(status)) {
    return apiError("INVALID_STATUS", "status debe ser active o inactive.");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const profileResult = await supabaseAdmin
    .from("profiles")
    .select("id,user_roles(role:roles(key))")
    .eq("id", id)
    .single();

  if (profileResult.error || !profileResult.data) {
    return apiError("USER_NOT_FOUND", "No existe usuario con ese id.", 404);
  }

  const roleKey = ((profileResult.data.user_roles ?? []) as Array<{
    role:
      | Array<{
          key: string;
        }>
      | {
          key: string;
        }
      | null;
  }>)
    .flatMap((item) => {
      if (!item.role) {
        return [];
      }

      if (Array.isArray(item.role)) {
        return item.role.map((role) => role.key);
      }

      return [item.role.key];
    })
    [0] ?? null;

  const updateProfileResult = await supabaseAdmin
    .from("profiles")
    .update({ status })
    .eq("id", id);
  if (updateProfileResult.error) {
    return apiError("PROFILE_STATUS_UPDATE_FAILED", updateProfileResult.error.message, 400);
  }

  if (roleKey === "producer") {
    const updateProducer = await supabaseAdmin
      .from("producers")
      .update({ status })
      .eq("user_id", id);

    if (updateProducer.error) {
      return apiError("PRODUCER_STATUS_UPDATE_FAILED", updateProducer.error.message, 400);
    }
  }

  if (roleKey === "mvz") {
    const updateMvz = await supabaseAdmin
      .from("mvz_profiles")
      .update({ status })
      .eq("user_id", id);

    if (updateMvz.error) {
      return apiError("MVZ_STATUS_UPDATE_FAILED", updateMvz.error.message, 400);
    }
  }

  return apiSuccess({
    id,
    status,
  });
}
