import { apiError, apiSuccess } from "@/shared/lib/api-response";
import { resolvePanelHomePath } from "@/shared/lib/auth";
import {
  resolveAuthenticatedRequestUser,
  type AuthError,
} from "@/server/auth";
import {
  createSupabaseAnonServerClient,
} from "@/server/auth/supabase";

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

  const authHeaders = new Headers(request.headers);
  authHeaders.set("authorization", `Bearer ${data.session.access_token}`);

  const authContextResult = await resolveAuthenticatedRequestUser(
    new Request(request.url, { headers: authHeaders })
  );
  if ("error" in authContextResult) {
    const errorPayload: AuthError = authContextResult.error;
    return apiError(
      errorPayload.code,
      errorPayload.message,
      errorPayload.status
    );
  }

  const user = authContextResult.user;
  const panelType = user.panelType;
  const permissions = user.permissions;

  const redirectByPanel = resolvePanelHomePath({
    panelType,
    permissions,
    isMvzInternal: user.isMvzInternal,
  });

  return apiSuccess({
    role: user.role,
    roleKey: user.roleKey,
    roleName: user.roleName,
    isSystemRole: user.isSystemRole,
    isMvzInternal: user.isMvzInternal,
    redirectTo: redirectByPanel,
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
    tenantType: user.tenantType,
    panelType: panelType ?? user.tenantType,
    permissions,
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      tokenType: data.session.token_type,
    },
  });
}
