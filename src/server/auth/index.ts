import { isAppRole, redirectPathForRole, type AppRole } from "@/shared/lib/auth";
import { getSupabaseAdminClient } from "@/server/auth/supabase";

export interface AuthError {
  status: number;
  code: string;
  message: string;
}

export interface RoleResolution {
  role: AppRole | null;
  error?: AuthError;
}

export interface AuthenticatedRequestUser {
  id: string;
  email: string;
  role: AppRole;
  accessToken: string;
}

function parseBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

function roleError(status: number, code: string, message: string): AuthError {
  return { status, code, message };
}

export async function resolveSingleRoleForUser(userId: string): Promise<RoleResolution> {
  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role:roles(key)")
    .eq("user_id", userId);

  if (error) {
    return {
      role: null,
      error: roleError(500, "ROLE_QUERY_FAILED", "No fue posible consultar el rol del usuario."),
    };
  }

  const rows = (data ?? []) as Array<{
    role:
      | {
          key: string;
        }[]
      | {
          key: string;
        }
      | null;
  }>;

  const roles = rows
    .flatMap((row) => {
      if (!row.role) {
        return [];
      }

      if (Array.isArray(row.role)) {
        return row.role.map((item) => item.key);
      }

      return [row.role.key];
    })
    .filter(isAppRole);

  if (roles.length === 0) {
    return {
      role: null,
      error: roleError(403, "ROLE_NOT_FOUND", "La cuenta no tiene un rol asignado."),
    };
  }

  if (roles.length > 1) {
    return {
      role: null,
      error: roleError(403, "ROLE_MULTI_ASSIGNED", "La cuenta tiene mas de un rol asignado."),
    };
  }

  return { role: roles[0] };
}

export function resolveRedirectByRole(role: AppRole): string {
  return redirectPathForRole(role);
}

export async function resolveAuthenticatedRequestUser(
  request: Request
): Promise<{ user: AuthenticatedRequestUser } | { error: AuthError }> {
  const accessToken = parseBearerToken(request);
  if (!accessToken) {
    return { error: roleError(401, "UNAUTHORIZED", "Falta token de autenticacion.") };
  }

  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data.user) {
    return { error: roleError(401, "UNAUTHORIZED", "Token invalido o expirado.") };
  }

  const roleResult = await resolveSingleRoleForUser(data.user.id);
  if (!roleResult.role || roleResult.error) {
    return {
      error:
        roleResult.error ??
        roleError(403, "ROLE_NOT_FOUND", "La cuenta no tiene un rol valido para acceder."),
    };
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email ?? "",
      role: roleResult.role,
      accessToken,
    },
  };
}

