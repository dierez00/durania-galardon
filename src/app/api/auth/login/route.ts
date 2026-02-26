import { apiError, apiSuccess } from "@/shared/lib/api-response";
import {
  resolveRedirectByRole,
  type AuthError,
} from "@/server/auth";
import {
  createSupabaseAnonServerClient,
  createSupabaseRlsServerClient,
} from "@/server/auth/supabase";
import { resolveTenant } from "@/server/tenants/resolveTenant";
import { isAppRole, isPermissionKey } from "@/shared/lib/auth";

interface LoginRequestBody {
  email?: string;
  password?: string;
  origin?: "public" | "admin";
}

export async function POST(request: Request) {
  let body: LoginRequestBody;

  try {
    body = (await request.json()) as LoginRequestBody;
  } catch {
    return apiError("INVALID_BODY", "El cuerpo de la solicitud no es JSON valido.");
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password?.trim();
  const origin = body.origin;

  if (!email || !password || (origin !== "public" && origin !== "admin")) {
    return apiError("INVALID_PAYLOAD", "Debe enviar email, password y origin valido.");
  }

  const supabase = createSupabaseAnonServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user || !data.session) {
    return apiError("INVALID_CREDENTIALS", "Correo o contrasena invalidos.", 401);
  }

  const rls = createSupabaseRlsServerClient(data.session.access_token);
  const preferredTenantSlug = request.headers.get("x-tenant-slug-resolved") ?? resolveTenant(request)?.tenantSlug;

  let contextQuery = rls
    .from("v_user_context")
    .select("tenant_id,tenant_slug,tenant_type,role_key,role_priority")
    .order("role_priority", { ascending: true })
    .limit(1);

  if (preferredTenantSlug) {
    contextQuery = contextQuery.eq("tenant_slug", preferredTenantSlug);
  }

  let contextResult = await contextQuery.maybeSingle();
  if ((contextResult.error || !contextResult.data) && preferredTenantSlug) {
    contextResult = await rls
      .from("v_user_context")
      .select("tenant_id,tenant_slug,tenant_type,role_key,role_priority")
      .order("role_priority", { ascending: true })
      .limit(1)
      .maybeSingle();
  }

  if (contextResult.error || !contextResult.data || !isAppRole(contextResult.data.role_key)) {
    const errorPayload: AuthError = {
      status: 403,
      code: "ROLE_NOT_FOUND",
      message: "La cuenta no tiene un rol valido.",
    };
    return apiError(
      errorPayload.code,
      errorPayload.message,
      errorPayload.status
    );
  }

  const permissionsResult = await rls
    .from("v_user_permissions")
    .select("permission_key")
    .eq("tenant_id", contextResult.data.tenant_id);

  const permissions = (permissionsResult.data ?? [])
    .map((row) => row.permission_key)
    .filter(isPermissionKey);

  const panelResult = await rls.rpc("auth_get_panel_type");
  const panelType = panelResult.data;

  const redirectByPanel =
    panelType === "government"
      ? "/admin"
      : panelType === "producer"
      ? "/producer"
      : panelType === "mvz"
      ? "/mvz"
      : resolveRedirectByRole(contextResult.data.role_key);

  return apiSuccess({
    roleKey: contextResult.data.role_key,
    redirectTo: redirectByPanel,
    tenantId: contextResult.data.tenant_id,
    tenantSlug: contextResult.data.tenant_slug,
    tenantType: contextResult.data.tenant_type,
    panelType: panelType ?? contextResult.data.tenant_type,
    permissions,
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      tokenType: data.session.token_type,
    },
  });
}
