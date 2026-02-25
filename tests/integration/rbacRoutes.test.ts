import { describe, it, expect } from "vitest";
import { GET as adminDashboardGet } from "../../src/app/api/admin/dashboard/route";
import { GET as mvzDashboardGet } from "../../src/app/api/mvz/dashboard/route";
import { GET as producerDashboardGet } from "../../src/app/api/producer/dashboard/route";
import { GET as authMeGet } from "../../src/app/api/auth/me/route";

describe("RBAC protected routes", () => {
  it("GET /api/admin/dashboard rejects requests without token", async () => {
    const request = new Request("http://localhost:3000/api/admin/dashboard", {
      method: "GET",
    });

    const response = await adminDashboardGet(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/mvz/dashboard rejects requests without token", async () => {
    const request = new Request("http://localhost:3000/api/mvz/dashboard", {
      method: "GET",
    });

    const response = await mvzDashboardGet(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/producer/dashboard rejects requests without token", async () => {
    const request = new Request("http://localhost:3000/api/producer/dashboard", {
      method: "GET",
    });

    const response = await producerDashboardGet(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/auth/me rejects requests without token", async () => {
    const request = new Request("http://localhost:3000/api/auth/me", {
      method: "GET",
    });

    const response = await authMeGet(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
