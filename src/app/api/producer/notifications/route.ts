import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { requireAuthorized } from "@/server/authz";
import { createSupabaseRlsServerClient } from "@/server/auth/supabase";

export async function GET(request: Request) {
  const auth = await requireAuthorized(request, {
    roles: ["producer", "employee"],
    permissions: ["producer.notifications.read"],
    resource: "producer.notifications",
  });
  if (!auth.ok) {
    return auth.response;
  }

  const supabase = createSupabaseRlsServerClient(auth.context.user.accessToken);
  const notificationsResult = await supabase
    .from("notification_events")
    .select("id,category,title,message,severity,related_upp_id,is_read,created_at")
    .eq("tenant_id", auth.context.user.tenantId)
    .or(`user_id.eq.${auth.context.user.id},role_key.eq.producer,role_key.eq.employee`)
    .order("created_at", { ascending: false })
    .limit(200);

  if (notificationsResult.error) {
    return apiError("PRODUCER_NOTIFICATIONS_QUERY_FAILED", notificationsResult.error.message, 500);
  }

  return apiSuccess({ notifications: notificationsResult.data ?? [] });
}
