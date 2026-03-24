import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/server/auth", () => ({
  resolveTenantContextFromRequest: vi.fn(),
}));

vi.mock("../../src/server/auth/supabase", () => ({
  getSupabaseAdminClient: vi.fn(),
}));

import { resolveTenantContextFromRequest } from "../../src/server/auth";
import { getSupabaseAdminClient } from "../../src/server/auth/supabase";
import { POST } from "../../src/app/api/public/appointments/route";

describe("public appointments route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/public/appointments rejects invalid payloads", async () => {
    vi.mocked(resolveTenantContextFromRequest).mockResolvedValue({
      tenant: {
        tenantId: "tenant-1",
        tenantSlug: "demo",
      },
    } as never);

    const request = new Request("http://localhost:3000/api/public/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestedService: "Consulta",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("INVALID_PAYLOAD");
  });

  it("POST /api/public/appointments creates an appointment with tenant context", async () => {
    vi.mocked(resolveTenantContextFromRequest).mockResolvedValue({
      tenant: {
        tenantId: "tenant-1",
        tenantSlug: "demo",
      },
    } as never);

    const single = vi.fn().mockResolvedValue({
      data: {
        id: "appt-1",
        status: "requested",
        created_at: "2026-03-18T00:00:00.000Z",
      },
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ insert }));

    vi.mocked(getSupabaseAdminClient).mockReturnValue({ from } as never);

    const request = new Request("http://localhost:3000/api/public/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: "Maria Perez",
        phone: "5551234567",
        email: "maria@example.com",
        requestedService: "Consulta",
        requestedDate: "2026-03-20",
        requestedTime: "10:00",
        notes: "Primera visita",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.appointment.id).toBe("appt-1");
    expect(body.data.tenantSlug).toBe("demo");
    expect(from).toHaveBeenCalledWith("appointment_requests");
  });
});
