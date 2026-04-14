function requireEnv(name: string, value: string | undefined): string {
  if (!value && process.env.NODE_ENV === "test") {
    return `test-${name.toLowerCase()}`;
  }

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function normalizeHostname(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const candidate = trimmed.includes("://")
    ? (() => {
        try {
          return new URL(trimmed).hostname;
        } catch {
          return "";
        }
      })()
    : trimmed.split("/")[0] ?? "";

  const hostname = candidate.split(":")[0]?.trim().toLowerCase() ?? "";
  return hostname || null;
}

function parseHostList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => normalizeHostname(item))
    .filter((item): item is string => Boolean(item));
}

export const publicEnv = {
  supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim() || undefined,
};

export function getServerEnv() {
  const configuredPublicHosts = new Set(parseHostList(process.env.PUBLIC_SITE_HOSTS));
  const siteUrlHost = normalizeHostname(process.env.NEXT_PUBLIC_SITE_URL ?? "");

  if (siteUrlHost) {
    configuredPublicHosts.add(siteUrlHost);
  }

  return {
    supabaseServiceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
    databaseUrl: requireEnv("DATABASE_URL", process.env.DATABASE_URL),
    databaseUrlDirect: requireEnv("DATABASE_URL_DIRECT", process.env.DATABASE_URL_DIRECT),
    apiOcrUrl: requireEnv("API_OCR_URL", process.env.API_OCR_URL),
    iotBackendUrl: requireEnv("IOT_BACKEND_URL", process.env.IOT_BACKEND_URL),
    defaultTenantSlug: process.env.DEFAULT_TENANT_SLUG ?? "default-tenant",
    publicSiteTenantSlug:
      process.env.PUBLIC_SITE_TENANT_SLUG?.trim().toLowerCase() || "gobierno-durango",
    publicSiteHosts: [...configuredPublicHosts],
  };
}

