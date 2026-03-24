import { describe, it, expect } from "vitest";
import { GET } from "../../src/app/api/tenant/resolve/route";

describe("GET /api/tenant/resolve", () => {
  it("returns tenant from subdomain", async () => {
    const request = new Request("https://app.local/api/tenant/resolve", {
      headers: {
        host: "acme.midominio.com",
      },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.tenant).toEqual({
      tenantSlug: "acme",
      source: "subdomain",
    });
  });
});
