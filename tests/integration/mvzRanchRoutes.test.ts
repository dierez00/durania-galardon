import { describe, expect, it } from "vitest";
import { GET as ranchOverviewGet } from "../../src/app/api/mvz/ranchos/[uppId]/overview/route";
import { GET as ranchAnimalsGet } from "../../src/app/api/mvz/ranchos/[uppId]/animales/route";
import { GET as ranchReportsGet } from "../../src/app/api/mvz/ranchos/[uppId]/reportes/route";

describe("MVZ ranch scoped routes", () => {
  it("GET /api/mvz/ranchos/:uppId/overview rejects requests without token", async () => {
    const request = new Request("http://localhost:3000/api/mvz/ranchos/test-upp/overview", {
      method: "GET",
    });

    const response = await ranchOverviewGet(request, {
      params: Promise.resolve({ uppId: "test-upp" }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/mvz/ranchos/:uppId/animales rejects requests without token", async () => {
    const request = new Request("http://localhost:3000/api/mvz/ranchos/test-upp/animales", {
      method: "GET",
    });

    const response = await ranchAnimalsGet(request, {
      params: Promise.resolve({ uppId: "test-upp" }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/mvz/ranchos/:uppId/reportes rejects requests without token", async () => {
    const request = new Request("http://localhost:3000/api/mvz/ranchos/test-upp/reportes", {
      method: "GET",
    });

    const response = await ranchReportsGet(request, {
      params: Promise.resolve({ uppId: "test-upp" }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
