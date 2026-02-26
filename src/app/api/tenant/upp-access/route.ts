import { requireAuthorized } from "@/server/authz";
import { createSupabaseRlsServerClient } from "@/server/auth/supabase";
import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { logAuditEvent } from "@/server/audit";

interface UpsertUppAccessBody {
  userId?: string;
  uppId?: string;
  accessLevel?: "owner" | "editor" | "viewer";
  status?: "active" | "inactive";
}

const VALID_ACCESS_LEVELS = new Set(["owner", "editor", "viewer"]);
const VALID_STATUS = new Set(["active", "inactive"]);

export async function POST(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.upps.write"],
    resource: "tenant.upp-access",
  });
  if (!auth.ok) {
    return auth.response;
  }

  let body: UpsertUppAccessBody;
  try {
    body = (await request.json()) as UpsertUppAccessBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const userId = body.userId?.trim();
  const uppId = body.uppId?.trim();
  const accessLevel = body.accessLevel;
  const status = body.status ?? "active";

  if (!userId || !uppId || !accessLevel || !VALID_ACCESS_LEVELS.has(accessLevel)) {
    return apiError("INVALID_PAYLOAD", "Debe enviar userId, uppId y accessLevel valido.");
  }

  if (!VALID_STATUS.has(status)) {
    return apiError("INVALID_PAYLOAD", "status debe ser active o inactive.");
  }

  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);

  const [membershipResult, uppResult] = await Promise.all([
    supabase
      .from("tenant_memberships")
      .select("id")
      .eq("tenant_id", auth.context.user.tenantId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("upps")
      .select("id")
      .eq("tenant_id", auth.context.user.tenantId)
      .eq("id", uppId)
      .maybeSingle(),
  ]);

  if (membershipResult.error) {
    return apiError("MEMBERSHIP_QUERY_FAILED", membershipResult.error.message, 500);
  }

  if (!membershipResult.data) {
    return apiError("MEMBERSHIP_NOT_FOUND", "El usuario no pertenece activamente a este tenant.", 404);
  }

  if (uppResult.error) {
    return apiError("UPP_QUERY_FAILED", uppResult.error.message, 500);
  }

  if (!uppResult.data) {
    return apiError("UPP_NOT_FOUND", "No existe UPP en el tenant actual.", 404);
  }

  const upsertResult = await supabase
    .from("user_upp_access")
    .upsert(
      {
        tenant_id: auth.context.user.tenantId,
        user_id: userId,
        upp_id: uppId,
        access_level: accessLevel,
        status,
        granted_by_user_id: auth.context.user.id,
      },
      {
        onConflict: "user_id,upp_id",
      }
    )
    .select("id,user_id,upp_id,access_level,status,granted_at")
    .single();

  if (upsertResult.error || !upsertResult.data) {
    return apiError(
      "UPP_ACCESS_UPSERT_FAILED",
      upsertResult.error?.message ?? "No fue posible asignar acceso UPP.",
      400
    );
  }

  await logAuditEvent({
    request,
    user: auth.context.user,
    action: "update",
    resource: "tenant.upp-access",
    resourceId: upsertResult.data.id,
    payload: {
      userId,
      uppId,
      accessLevel,
      status,
    },
  });

  return apiSuccess(
    {
      uppAccess: upsertResult.data,
    },
    { status: 201 }
  );
}
