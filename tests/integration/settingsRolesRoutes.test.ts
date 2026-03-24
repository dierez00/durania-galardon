import { describe, expect, it } from "vitest";
import {
  DELETE as deleteProducerRoles,
  GET as getProducerRoles,
  POST as postProducerRoles,
  PATCH as patchProducerRoles,
} from "../../src/app/api/producer/roles/route";
import {
  DELETE as deleteMvzRoles,
  GET as getMvzRoles,
  POST as postMvzRoles,
  PATCH as patchMvzRoles,
} from "../../src/app/api/mvz/roles/route";
import { GET as getProducerSettingsRanchos } from "../../src/app/api/producer/settings/ranchos/route";

describe("settings roles routes", () => {
  it("GET /api/producer/roles rejects requests without token", async () => {
    const response = await getProducerRoles(
      new Request("http://localhost:3000/api/producer/roles", { method: "GET" })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("POST /api/producer/roles rejects requests without token", async () => {
    const response = await postProducerRoles(
      new Request("http://localhost:3000/api/producer/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Operador", permissionKeys: ["producer.roles.read"] }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("PATCH /api/producer/roles rejects requests without token", async () => {
    const response = await patchProducerRoles(
      new Request("http://localhost:3000/api/producer/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: "role-1", name: "Operador" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("DELETE /api/producer/roles rejects requests without token", async () => {
    const response = await deleteProducerRoles(
      new Request("http://localhost:3000/api/producer/roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: "role-1" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/mvz/roles rejects requests without token", async () => {
    const response = await getMvzRoles(
      new Request("http://localhost:3000/api/mvz/roles", { method: "GET" })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("POST /api/mvz/roles rejects requests without token", async () => {
    const response = await postMvzRoles(
      new Request("http://localhost:3000/api/mvz/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Supervisor MVZ", permissionKeys: ["mvz.roles.read"] }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("PATCH /api/mvz/roles rejects requests without token", async () => {
    const response = await patchMvzRoles(
      new Request("http://localhost:3000/api/mvz/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: "role-1", name: "Supervisor MVZ" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("DELETE /api/mvz/roles rejects requests without token", async () => {
    const response = await deleteMvzRoles(
      new Request("http://localhost:3000/api/mvz/roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: "role-1" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/producer/settings/ranchos rejects requests without token", async () => {
    const response = await getProducerSettingsRanchos(
      new Request("http://localhost:3000/api/producer/settings/ranchos", { method: "GET" })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
