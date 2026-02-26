import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { createSupabaseRlsServerClient } from "@/server/auth/supabase";

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["tenant_admin"],
    permissions: ["admin.audit.read"],
    resource: "admin.audit",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const action = url.searchParams.get("action");
  const resource = url.searchParams.get("resource");
  const limit = Number(url.searchParams.get("limit") ?? "100");

  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);
  let query = supabase
    .from("audit_logs")
    .select("id,actor_user_id,role_key,action,resource,resource_id,payload_json,ip,user_agent,created_at")
    .eq("tenant_id", auth.context.user.tenantId)
    .order("created_at", { ascending: false })
    .limit(Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 500) : 100);

  if (from) {
    query = query.gte("created_at", from);
  }
  if (to) {
    query = query.lte("created_at", to);
  }
  if (action) {
    query = query.eq("action", action);
  }
  if (resource) {
    query = query.eq("resource", resource);
  }

  const logsResult = await query;

  if (logsResult.error) {
    return apiError("ADMIN_AUDIT_QUERY_FAILED", logsResult.error.message, 500);
  }

  return apiSuccess({ logs: logsResult.data ?? [] });
}
