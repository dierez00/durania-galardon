import { getSupabaseAdminClient } from "@/server/auth/supabase";
import type { AuthenticatedRequestUser } from "@/server/auth";
import type { AuditAction, AppRole } from "@/shared/lib/auth";

interface LogAuditEventInput {
  request: Request;
  action: AuditAction;
  resource: string;
  resourceId?: string | null;
  payload?: Record<string, unknown> | null;
  user?: AuthenticatedRequestUser | null;
  tenantId?: string | null;
  roleKey?: AppRole | null;
}

function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) {
    return null;
  }

  const firstIp = forwarded.split(",")[0]?.trim();
  return firstIp || null;
}

export async function logAuditEvent(input: LogAuditEventInput): Promise<void> {
  try {
    const supabaseAdmin = getSupabaseAdminClient();
    await supabaseAdmin.from("audit_logs").insert({
      tenant_id: input.user?.tenantId ?? input.tenantId ?? null,
      actor_user_id: input.user?.id ?? null,
      role_key: input.user?.role ?? input.roleKey ?? null,
      action: input.action,
      resource: input.resource,
      resource_id: input.resourceId ?? null,
      payload_json: input.payload ?? null,
      ip: getClientIp(input.request),
      user_agent: input.request.headers.get("user-agent"),
    });
  } catch {
    // Audit logging must never block business flow.
  }
}
