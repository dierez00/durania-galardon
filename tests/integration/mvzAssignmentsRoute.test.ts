import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/server/authz", () => ({
  requireAuthorized: vi.fn(),
}));

vi.mock("../../src/server/authz/profiles", () => ({
  resolveMvzProfileId: vi.fn(),
}));

import { requireAuthorized } from "../../src/server/authz";
import { resolveMvzProfileId } from "../../src/server/authz/profiles";
import { GET } from "../../src/app/api/mvz/assignments/route";

describe("mvz assignments route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/mvz/assignments rejects unauthorized requests", async () => {
    vi.mocked(requireAuthorized).mockResolvedValue({
      ok: false,
      response: new Response(
        JSON.stringify({
          ok: false,
          error: { code: "UNAUTHORIZED", message: "Unauthorized" },
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      ),
    } as never);

    const response = await GET(new Request("http://localhost:3000/api/mvz/assignments"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/mvz/assignments returns MVZ_PROFILE_NOT_FOUND when user has no active profile", async () => {
    vi.mocked(requireAuthorized).mockResolvedValue({
      ok: true,
      context: {
        user: {
          id: "user-1",
          tenantId: "tenant-1",
          accessToken: "token-1",
        },
      },
    } as never);
    vi.mocked(resolveMvzProfileId).mockResolvedValue(null);

    const response = await GET(new Request("http://localhost:3000/api/mvz/assignments"));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("MVZ_PROFILE_NOT_FOUND");
  });
});
