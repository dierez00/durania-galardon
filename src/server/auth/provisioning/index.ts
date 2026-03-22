import { getServerEnv, publicEnv } from "@/shared/config";
import { getSupabaseProvisioningClient } from "@/server/auth/supabase";

export interface ProvisionUserInput {
  email: string;
  password: string;
  emailConfirmed?: boolean;
}

export async function createAuthUser(input: ProvisionUserInput) {
  const provisioning = getSupabaseProvisioningClient();
  return provisioning.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: input.emailConfirmed ?? true,
  });
}

export async function deleteAuthUser(userId: string) {
  const provisioning = getSupabaseProvisioningClient();
  return provisioning.auth.admin.deleteUser(userId);
}

export async function updateAuthUserStatus(userId: string, bannedUntil?: string) {
  const provisioning = getSupabaseProvisioningClient();
  return provisioning.auth.admin.updateUserById(userId, {
    ban_duration: bannedUntil,
  });
}

export async function fetchAuthUserDisplayName(userId: string): Promise<string | null> {
  const provisioning = getSupabaseProvisioningClient();
  const result = await provisioning.auth.admin.getUserById(userId);

  if (result.error || !result.data.user) {
    return null;
  }

  const metadata = result.data.user.user_metadata ?? {};
  const fullName = metadata.full_name;
  const name = metadata.name;
  const displayName = metadata.display_name;

  if (typeof fullName === "string" && fullName.trim().length > 0) {
    return fullName.trim();
  }

  if (typeof name === "string" && name.trim().length > 0) {
    return name.trim();
  }

  if (typeof displayName === "string" && displayName.trim().length > 0) {
    return displayName.trim();
  }

  return null;
}

/**
 * Verifica si un email ya está registrado en Supabase Auth.
 * Llama directamente a la API REST de GoTrue con el service role key.
 * Retorna `true` si el email ya existe, `false` si está disponible.
 */
export async function authEmailExists(email: string): Promise<boolean> {
  const { supabaseServiceRoleKey } = getServerEnv();
  const url = new URL(`${publicEnv.supabaseUrl}/auth/v1/admin/users`);
  url.searchParams.set("page", "1");
  url.searchParams.set("per_page", "1");
  // GoTrue filtra por email con el parámetro filter (partial match)
  url.searchParams.set("filter", email);

  const resp = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      apikey: supabaseServiceRoleKey,
    },
  });

  if (!resp.ok) return false;
  const data = (await resp.json()) as { users?: Array<{ email?: string }> };
  // Verificación exacta: el filter de GoTrue puede ser un partial match
  return (data.users ?? []).some(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
}

/**
 * Verifica, en paralelo, cuáles emails de un arreglo ya existen en Supabase Auth.
 * Retorna un Set con los emails que ya están registrados (en minúsculas).
 */
export async function authEmailsExistBulk(emails: string[]): Promise<Set<string>> {
  const results = await Promise.all(
    emails.map(async (email) => {
      const exists = await authEmailExists(email);
      return exists ? email.toLowerCase() : null;
    })
  );
  return new Set(results.filter((e): e is string => e !== null));
}

export async function fetchAuthUserEmail(userId: string): Promise<string | null> {
  try {
    const { supabaseServiceRoleKey } = getServerEnv();
    const url = `${publicEnv.supabaseUrl}/auth/v1/admin/users/${userId}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        apikey: supabaseServiceRoleKey,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { email?: string };
    return data.email ?? null;
  } catch {
    return null;
  }
}

export async function updateAuthUserEmail(userId: string, email: string): Promise<boolean> {
  try {
    const { supabaseServiceRoleKey } = getServerEnv();
    const url = `${publicEnv.supabaseUrl}/auth/v1/admin/users/${userId}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${supabaseServiceRoleKey}`,
        apikey: supabaseServiceRoleKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function updateAuthUserDisplayName(userId: string, displayName: string): Promise<boolean> {
  const provisioning = getSupabaseProvisioningClient();
  const userResult = await provisioning.auth.admin.getUserById(userId);

  if (userResult.error || !userResult.data.user) {
    return false;
  }

  const currentMetadata =
    userResult.data.user.user_metadata && typeof userResult.data.user.user_metadata === "object"
      ? userResult.data.user.user_metadata
      : {};

  const updateResult = await provisioning.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...currentMetadata,
      full_name: displayName,
      display_name: displayName,
      name: displayName,
    },
  });

  return !updateResult.error;
}
