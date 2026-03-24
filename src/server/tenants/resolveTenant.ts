import type { ITenantResolver, TenantContext } from "@/core/domain";

const TENANT_SLUG_REGEX = /^[a-z0-9-]+$/;
const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function stripPort(host: string): string {
  return host.split(":")[0]?.toLowerCase() ?? "";
}

function extractSubdomain(hostname: string): string | null {
  if (LOCALHOST_HOSTNAMES.has(hostname)) {
    return null;
  }

  const parts = hostname.split(".");
  if (parts.length < 3) {
    return null;
  }

  const candidate = parts[0];
  if (!candidate || !TENANT_SLUG_REGEX.test(candidate)) {
    return null;
  }

  return candidate;
}

function isLocalRequest(hostname: string): boolean {
  if (LOCALHOST_HOSTNAMES.has(hostname)) {
    return true;
  }

  return hostname.endsWith(".localhost");
}

export class SubdomainTenantResolver implements ITenantResolver {
  resolve(request: Request): TenantContext | null {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const host = request.headers.get("host");
    const tenantHeader = request.headers.get("x-tenant-slug")?.trim().toLowerCase();
    const fallbackTenant = (process.env.DEFAULT_TENANT_SLUG ?? "default-tenant").trim().toLowerCase();

    const hostname = stripPort(forwardedHost || host || "");
    const subdomainSlug = extractSubdomain(hostname);
    if (subdomainSlug) {
      return {
        tenantSlug: subdomainSlug,
        source: "subdomain",
      };
    }

    if (tenantHeader && TENANT_SLUG_REGEX.test(tenantHeader)) {
      return {
        tenantSlug: tenantHeader,
        source: "header",
      };
    }

    if (hostname && isLocalRequest(hostname) && TENANT_SLUG_REGEX.test(fallbackTenant)) {
      return {
        tenantSlug: fallbackTenant,
        source: "local",
      };
    }

    return null;
  }
}

export const tenantResolver = new SubdomainTenantResolver();

export function resolveTenant(request: Request): TenantContext | null {
  return tenantResolver.resolve(request);
}
