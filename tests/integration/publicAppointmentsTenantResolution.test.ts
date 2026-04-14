import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const supabaseMocks = vi.hoisted(() => ({
  getSupabaseProvisioningClient: vi.fn(),
  getSupabaseAdminClient: vi.fn(),
  createSupabaseRlsServerClient: vi.fn(),
}));

vi.mock("../../src/server/auth/supabase", () => ({
  getSupabaseProvisioningClient: supabaseMocks.getSupabaseProvisioningClient,
  getSupabaseAdminClient: supabaseMocks.getSupabaseAdminClient,
  createSupabaseRlsServerClient: supabaseMocks.createSupabaseRlsServerClient,
}));

import { POST } from "../../src/app/api/public/appointments/route";

describe("public appointments tenant resolution", () => {
  const previousPublicSiteTenant = process.env.PUBLIC_SITE_TENANT_SLUG;
  const previousPublicSiteHosts = process.env.PUBLIC_SITE_HOSTS;
  const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PUBLIC_SITE_TENANT_SLUG = "gobierno-durango";
    process.env.PUBLIC_SITE_HOSTS = "durania-galardon.vercel.app";
    process.env.NEXT_PUBLIC_SITE_URL = "https://durania-galardon.vercel.app";
  });

  afterEach(() => {
    process.env.PUBLIC_SITE_TENANT_SLUG = previousPublicSiteTenant;
    process.env.PUBLIC_SITE_HOSTS = previousPublicSiteHosts;
    process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
  });

  it("POST /api/public/appointments resolves the public tenant from a vercel host", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: "tenant-1",
        slug: "gobierno-durango",
        status: "active",
      },
      error: null,
    });
    const provisioningSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle,
        })),
      })),
    }));

    supabaseMocks.getSupabaseProvisioningClient.mockReturnValue({
      from: vi.fn(() => ({
        select: provisioningSelect,
      })),
    });

    const single = vi.fn().mockResolvedValue({
      data: {
        id: "appt-1",
        status: "requested",
        created_at: "2026-04-13T00:00:00.000Z",
      },
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const adminFrom = vi.fn(() => ({ insert }));

    supabaseMocks.getSupabaseAdminClient.mockReturnValue({
      from: adminFrom,
    });

    const request = new Request("https://durania-galardon.vercel.app/api/public/appointments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        host: "durania-galardon.vercel.app",
      },
      body: JSON.stringify({
        fullName: "Maria Perez",
        phone: "5551234567",
        email: "maria@example.com",
        requestedService: "Consulta",
        requestedDate: "2026-04-20",
        requestedTime: "10:00",
        notes: "Primera visita",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(body.data.tenantSlug).toBe("gobierno-durango");
    expect(adminFrom).toHaveBeenCalledWith("appointment_requests");
  });
});
