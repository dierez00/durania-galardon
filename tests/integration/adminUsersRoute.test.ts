import { describe, it, expect } from "vitest";
import { GET, PATCH } from "../../src/app/api/admin/appointments/route";
import { GET as getAppointmentDetail, PATCH as patchAppointmentDetail } from "../../src/app/api/admin/appointments/[id]/route";

describe("admin appointments routes", () => {
  it("GET /api/admin/appointments rejects requests without token", async () => {
    const request = new Request("http://localhost:3000/api/admin/appointments", {
      method: "GET",
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("PATCH /api/admin/appointments rejects requests without token", async () => {
    const request = new Request("http://localhost:3000/api/admin/appointments", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: "abc123",
        status: "contacted",
      }),
    });

    const response = await PATCH(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/admin/appointments/[id] rejects requests without token", async () => {
    const request = new Request("http://localhost:3000/api/admin/appointments/abc123", {
      method: "GET",
    });

    const response = await getAppointmentDetail(request, {
      params: Promise.resolve({ id: "abc123" }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("PATCH /api/admin/appointments/[id] rejects requests without token", async () => {
    const request = new Request("http://localhost:3000/api/admin/appointments/abc123", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "contacted",
      }),
    });

    const response = await patchAppointmentDetail(request, {
      params: Promise.resolve({ id: "abc123" }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
