import { apiError, apiSuccess } from "@/shared/lib/api-response";
import {
  resolveRedirectByRole,
  resolveSingleRoleForUser,
} from "@/server/auth";
import { createSupabaseAnonServerClient } from "@/server/auth/supabase";

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

  const roleResult = await resolveSingleRoleForUser(data.user.id);
  if (!roleResult.role || roleResult.error) {
    return apiError(
      roleResult.error?.code ?? "ROLE_NOT_FOUND",
      roleResult.error?.message ?? "La cuenta no tiene un rol valido.",
      roleResult.error?.status ?? 403
    );
  }

  return apiSuccess({
    role: roleResult.role,
    redirectTo: resolveRedirectByRole(roleResult.role),
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      tokenType: data.session.token_type,
    },
  });
}
