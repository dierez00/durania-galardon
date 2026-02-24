import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveTenant } from "../../src/server/tenants/resolveTenant";

describe("resolveTenant", () => {
  const previousDefaultTenant = process.env.DEFAULT_TENANT_SLUG;

  beforeEach(() => {
    process.env.DEFAULT_TENANT_SLUG = "dev-tenant";
  });

  afterEach(() => {
    process.env.DEFAULT_TENANT_SLUG = previousDefaultTenant;
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
