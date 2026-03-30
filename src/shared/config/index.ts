function requireEnv(name: string, value: string | undefined): string {
  if (!value && process.env.NODE_ENV === "test") {
    return `test-${name.toLowerCase()}`;
  }

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export const publicEnv = {
  supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || undefined,
};

export function getServerEnv() {
  return {
    supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
    databaseUrl: requireEnv("DATABASE_URL", process.env.DATABASE_URL),
    databaseUrlDirect: requireEnv("DATABASE_URL_DIRECT", process.env.DATABASE_URL_DIRECT),
    apiOcrUrl: requireEnv("API_OCR_URL", process.env.API_OCR_URL),
    iotBackendUrl: requireEnv("IOT_BACKEND_URL", process.env.IOT_BACKEND_URL),
    defaultTenantSlug: process.env.DEFAULT_TENANT_SLUG ?? "default-tenant",
  };
}

