import { describe, it, expect } from "vitest";
import { GET as getMemberships } from "../../src/app/api/tenant/iam/memberships/route";
import { POST as postRole } from "../../src/app/api/tenant/iam/roles/route";
import { GET as getAppointments } from "../../src/app/api/tenant/appointments/route";

describe("tenant IAM routes", () => {
  it("GET /api/tenant/iam/memberships rejects requests without token", async () => {
    const request = new Request("http://localhost:3000/api/tenant/iam/memberships", {
      method: "GET",
    });

    const response = await getMemberships(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("POST /api/tenant/iam/roles rejects requests without token", async () => {
    const request = new Request("http://localhost:3000/api/tenant/iam/roles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: "operador",
        name: "Operador",
      }),
    });

    const response = await postRole(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/tenant/appointments rejects requests without token", async () => {
    const request = new Request("http://localhost:3000/api/tenant/appointments", {
      method: "GET",
    });

    const response = await getAppointments(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
