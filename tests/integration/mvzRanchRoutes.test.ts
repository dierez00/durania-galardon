import { describe, expect, it } from "vitest";
import { GET as ranchOverviewGet } from "../../src/app/api/mvz/ranchos/[uppId]/overview/route";
import { GET as ranchAnimalsGet } from "../../src/app/api/mvz/ranchos/[uppId]/animales/route";
import { GET as ranchAnimalDetailGet } from "../../src/app/api/mvz/ranchos/[uppId]/animales/[animalId]/route";
import { DELETE as ranchIncidentDelete } from "../../src/app/api/mvz/ranchos/[uppId]/incidencias/route";
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

  it("GET /api/mvz/ranchos/:uppId/animales/:animalId rejects requests without token", async () => {
    const request = new Request("http://localhost:3000/api/mvz/ranchos/test-upp/animales/test-animal", {
      method: "GET",
    });

    const response = await ranchAnimalDetailGet(request, {
      params: Promise.resolve({ uppId: "test-upp", animalId: "test-animal" }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("DELETE /api/mvz/ranchos/:uppId/incidencias rejects requests without token", async () => {
    const request = new Request("http://localhost:3000/api/mvz/ranchos/test-upp/incidencias?id=test-incident", {
      method: "DELETE",
    });

    const response = await ranchIncidentDelete(request, {
      params: Promise.resolve({ uppId: "test-upp" }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
