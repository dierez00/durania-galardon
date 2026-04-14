import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveTenant } from "../../src/server/tenants/resolveTenant";

describe("resolveTenant", () => {
  const previousDefaultTenant = process.env.DEFAULT_TENANT_SLUG;
  const previousPublicSiteTenant = process.env.PUBLIC_SITE_TENANT_SLUG;
  const previousPublicSiteHosts = process.env.PUBLIC_SITE_HOSTS;
  const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    process.env.DEFAULT_TENANT_SLUG = "dev-tenant";
    process.env.PUBLIC_SITE_TENANT_SLUG = "gobierno-durango";
    process.env.PUBLIC_SITE_HOSTS = "durania-galardon.vercel.app";
    process.env.NEXT_PUBLIC_SITE_URL = "https://durania-galardon.vercel.app";
  });

  afterEach(() => {
    process.env.DEFAULT_TENANT_SLUG = previousDefaultTenant;
    process.env.PUBLIC_SITE_TENANT_SLUG = previousPublicSiteTenant;
    process.env.PUBLIC_SITE_HOSTS = previousPublicSiteHosts;
    process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
  });

  it("resolves tenant from subdomain", () => {
    const request = new Request("https://app.local/api/tenant/resolve", {
      headers: {
        host: "acme.midominio.com",
      },
    });

    const tenant = resolveTenant(request);
    expect(tenant).toEqual({
      tenantSlug: "acme",
      source: "subdomain",
    });
  });

  it("falls back to header tenant", () => {
    const request = new Request("https://app.local/api/tenant/resolve", {
      headers: {
        host: "midominio.com",
        "x-tenant-slug": "header-tenant",
      },
    });

    const tenant = resolveTenant(request);
    expect(tenant).toEqual({
      tenantSlug: "header-tenant",
      source: "header",
    });
  });

  it("resolves public tenant from configured vercel host", () => {
    const request = new Request("https://durania-galardon.vercel.app/api/tenant/resolve", {
      headers: {
        host: "durania-galardon.vercel.app",
      },
    });

    const tenant = resolveTenant(request);
    expect(tenant).toEqual({
      tenantSlug: "gobierno-durango",
      source: "public-site",
    });
  });

  it("resolves public tenant from vercel preview hosts", () => {
    const request = new Request("https://rama-x.vercel.app/api/tenant/resolve", {
      headers: {
        host: "rama-x.vercel.app",
      },
    });

    const tenant = resolveTenant(request);
    expect(tenant).toEqual({
      tenantSlug: "gobierno-durango",
      source: "public-site",
    });
  });

  it("uses local fallback in localhost", () => {
    const request = new Request("http://localhost:3000/api/tenant/resolve", {
      headers: {
        host: "localhost:3000",
      },
    });

    const tenant = resolveTenant(request);
    expect(tenant).toEqual({
      tenantSlug: "dev-tenant",
      source: "local",
    });
  });

  it("returns null for invalid tenant host and header", () => {
    const request = new Request("https://app.local/api/tenant/resolve", {
      headers: {
        host: "midominio.com",
        "x-tenant-slug": "INVALID_HEADER",
      },
    });

    const tenant = resolveTenant(request);
    expect(tenant).toBeNull();
  });
});
