import { describe, it, expect } from "vitest";
import { GET, POST } from "../../src/app/api/admin/users/route";

describe("admin users routes", () => {
  it("GET /api/admin/users rejects requests without token", async () => {
    const request = new Request("http://localhost:3000/api/admin/users", {
      method: "GET",
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("POST /api/admin/users rejects requests without token", async () => {
    const request = new Request("http://localhost:3000/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "new@example.com",
        password: "secret123",
        fullName: "Usuario Nuevo",
        role: "producer",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
