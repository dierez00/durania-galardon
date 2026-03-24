import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";

interface AssignedUpp {
  id: string;
  name: string;
  uppCode: string | null;
  accessLevel: string;
}

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, { resource: "auth.invite_context" });
  if (!auth.ok) {
    return auth.response;
  }

  const provisioning = getSupabaseProvisioningClient();
  const tenantResult = await provisioning
    .from("tenants")
    .select("id,slug,type,name")
    .eq("id", auth.context.user.tenantId)
    .maybeSingle();

  if (tenantResult.error || !tenantResult.data) {
    return apiError(
      "TENANT_NOT_FOUND",
      tenantResult.error?.message ?? "No fue posible resolver el tenant de la invitacion.",
      404
    );
  }

  let assignedUpps: AssignedUpp[] = [];

  if (auth.context.user.panelType === "producer") {
    const accessResult = await provisioning
      .from("user_upp_access")
      .select("upp_id,access_level")
      .eq("tenant_id", auth.context.user.tenantId)
      .eq("user_id", auth.context.user.id)
      .eq("status", "active");

    if (accessResult.error) {
      return apiError(
        "INVITE_CONTEXT_ACCESS_FAILED",
        accessResult.error.message,
        500
      );
    }

    const uppIds = Array.from(
      new Set(
        (accessResult.data ?? [])
          .map((row) => row.upp_id)
          .filter((uppId): uppId is string => Boolean(uppId))
      )
    );

    if (uppIds.length > 0) {
      const uppsResult = await provisioning
        .from("upps")
        .select("id,name,upp_code")
        .eq("tenant_id", auth.context.user.tenantId)
        .in("id", uppIds);

      if (uppsResult.error) {
        return apiError("INVITE_CONTEXT_UPPS_FAILED", uppsResult.error.message, 500);
      }

      const uppById = new Map(
        (uppsResult.data ?? []).map((upp) => [
          upp.id,
          {
            id: upp.id,
            name: upp.name,
            uppCode: upp.upp_code,
          },
        ])
      );

      assignedUpps = (accessResult.data ?? [])
        .map((row) => {
          const upp = row.upp_id ? uppById.get(row.upp_id) : null;
          if (!upp) {
            return null;
          }

          return {
            ...upp,
            accessLevel: row.access_level,
          };
        })
        .filter((upp): upp is AssignedUpp => upp !== null);
    }
  }

  return apiSuccess({
    panelType: auth.context.user.panelType,
    tenantId: tenantResult.data.id,
    tenantSlug: tenantResult.data.slug,
    tenantName: tenantResult.data.name,
    roleKey: auth.context.user.roleKey,
    roleName: auth.context.user.roleName,
    assignedUpps,
  });
}
