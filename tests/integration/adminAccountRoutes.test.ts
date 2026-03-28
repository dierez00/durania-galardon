import { describe, expect, it } from "vitest";
import { GET as getAdminProfile, PATCH as patchAdminProfile } from "../../src/app/api/admin/profile/route";
import { GET as getAdminSettings, PATCH as patchAdminSettings } from "../../src/app/api/admin/settings/route";

describe("admin account routes", () => {
  it("GET /api/admin/profile rejects requests without token", async () => {
    const response = await getAdminProfile(
      new Request("http://localhost:3000/api/admin/profile", {
        method: "GET",
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("PATCH /api/admin/profile rejects requests without token", async () => {
    const response = await patchAdminProfile(
      new Request("http://localhost:3000/api/admin/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName: "Admin Demo" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/admin/settings rejects requests without token", async () => {
    const response = await getAdminSettings(
      new Request("http://localhost:3000/api/admin/settings", {
        method: "GET",
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("PATCH /api/admin/settings rejects requests without token", async () => {
    const response = await patchAdminSettings(
      new Request("http://localhost:3000/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ organizationName: "Tenant Demo" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
