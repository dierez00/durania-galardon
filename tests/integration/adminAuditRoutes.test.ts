import { describe, expect, it } from "vitest";
import { GET } from "../../src/app/api/admin/audit/route";

describe("admin audit routes", () => {
  it("GET /api/admin/audit rejects requests without token", async () => {
    const request = new Request("http://localhost:3000/api/admin/audit", {
      method: "GET",
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
