import { requireAuthorized } from "@/server/authz";
import { getSupabaseAdminClient } from "@/server/auth/supabase";
import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { logAuditEvent } from "@/server/audit";

interface UpsertMvzAssignmentBody {
  mvzUserId?: string;
  uppId?: string;
  status?: "active" | "inactive";
}

const VALID_STATUS = new Set(["active", "inactive"]);

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.mvz.write", "admin.upps.write"],
    requireAllPermissions: true,
    resource: "tenant.mvz-assignments",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: UpsertMvzAssignmentBody;
  try {
    body = (await request.json()) as UpsertMvzAssignmentBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const mvzUserId = body.mvzUserId?.trim();
  const uppId = body.uppId?.trim();
  const status = body.status ?? "active";

  if (!mvzUserId || !uppId) {
    return apiError("INVALID_PAYLOAD", "Debe enviar mvzUserId y uppId.");
  }

  if (!VALID_STATUS.has(status)) {
    return apiError("INVALID_PAYLOAD", "status debe ser active o inactive.");
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const [mvzProfileResult, uppResult] = await Promise.all([
    supabaseAdmin
      .from("mvz_profiles")
      .select("id")
      .eq("tenant_id", auth.context.user.tenantId)
      .eq("user_id", mvzUserId)
      .maybeSingle(),
    supabaseAdmin
      .from("upps")
      .select("id")
      .eq("tenant_id", auth.context.user.tenantId)
      .eq("id", uppId)
      .maybeSingle(),
  ]);

  if (mvzProfileResult.error) {
    return apiError("MVZ_PROFILE_QUERY_FAILED", mvzProfileResult.error.message, 500);
  }

  if (!mvzProfileResult.data) {
    return apiError("MVZ_PROFILE_NOT_FOUND", "No existe perfil MVZ en este tenant.", 404);
  }

  if (uppResult.error) {
    return apiError("UPP_QUERY_FAILED", uppResult.error.message, 500);
  }

  if (!uppResult.data) {
    return apiError("UPP_NOT_FOUND", "No existe UPP en el tenant actual.", 404);
  }

  const upsertResult = await supabaseAdmin
    .from("mvz_upp_assignments")
    .upsert(
      {
        tenant_id: auth.context.user.tenantId,
        mvz_profile_id: mvzProfileResult.data.id,
        upp_id: uppId,
        status,
        ...(status === "inactive" ? { unassigned_at: new Date().toISOString() } : { unassigned_at: null }),
      },
      {
        onConflict: "mvz_profile_id,upp_id",
      }
    )
    .select("id,mvz_profile_id,upp_id,status,assigned_at,unassigned_at")
    .single();

  if (upsertResult.error || !upsertResult.data) {
    return apiError(
      "MVZ_ASSIGNMENT_UPSERT_FAILED",
      upsertResult.error?.message ?? "No fue posible asignar MVZ a UPP.",
      400
    );
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "update",
    resource: "tenant.mvz-assignments",
    resourceId: upsertResult.data.id,
    payload: {
      mvzUserId,
      uppId,
      status,
    },
  });

  return apiSuccess(
    {
      assignment: upsertResult.data,
    },
    { status: 201 }
  );
}
