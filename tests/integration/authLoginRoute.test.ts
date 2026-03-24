import { describe, it, expect } from "vitest";
import { POST } from "../../src/app/api/auth/login/route";

describe("POST /api/auth/login", () => {
  it("returns 400 for invalid payload", async () => {
    const request = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "user@example.com",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("INVALID_PAYLOAD");
  });
});
