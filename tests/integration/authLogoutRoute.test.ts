import { describe, it, expect } from "vitest";
import { POST } from "../../src/app/api/auth/logout/route";

describe("POST /api/auth/logout", () => {
  it("returns signed_out status", async () => {
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe("signed_out");
  });
});
