import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv, publicEnv } from "@/shared/config";

<<<<<<< Updated upstream
let adminClient: SupabaseClient | null = null;
=======
>>>>>>> Stashed changes
let provisioningClient: SupabaseClient | null = null;

function buildAuthConfig(accessToken?: string) {
  return {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  };
}

<<<<<<< Updated upstream
export function createSupabaseRlsServerClient(accessToken: string): SupabaseClient {
  return createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function getSupabaseAdminClient(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(publicEnv.supabaseUrl, getServerEnv().supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
=======
export function createSupabaseAnonServerClient(): SupabaseClient {
  return createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, buildAuthConfig());
}

export function createSupabaseRlsServerClient(accessToken: string): SupabaseClient {
  return createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, buildAuthConfig(accessToken));
}

export function getSupabaseProvisioningClient(): SupabaseClient {
  if (!provisioningClient) {
    provisioningClient = createClient(
      publicEnv.supabaseUrl,
      getServerEnv().supabaseServiceRoleKey,
      buildAuthConfig()
    );
>>>>>>> Stashed changes
  }

  return provisioningClient;
}

<<<<<<< Updated upstream
export function getSupabaseProvisioningClient(): SupabaseClient {
  if (!provisioningClient) {
    provisioningClient = createClient(publicEnv.supabaseUrl, getServerEnv().supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return provisioningClient;
}
=======
// Backward compatibility while routes are migrated.
export const getSupabaseAdminClient = getSupabaseProvisioningClient;
>>>>>>> Stashed changes
