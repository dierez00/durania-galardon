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
