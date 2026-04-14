import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/server/authz", () => ({
  requireAuthorized: vi.fn(),
}));

vi.mock("../../src/server/auth/supabase", () => ({
  getSupabaseAdminClient: vi.fn(),
  getSupabaseProvisioningClient: vi.fn(),
}));

vi.mock("../../src/server/audit", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

import { requireAuthorized } from "../../src/server/authz";
import { getSupabaseAdminClient } from "../../src/server/auth/supabase";
import { GET as getAdminExportDetail, PATCH as patchAdminExportDetail, DELETE as deleteAdminExportDetail } from "../../src/app/api/admin/exports/[id]/route";
import { POST as postAdminExports } from "../../src/app/api/admin/exports/route";

function unauthorizedResponse() {
  return new Response(
    JSON.stringify({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Unauthorized" },
    }),
    {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }
  );
}

function authorizedContext() {
  return {
    ok: true,
    context: {
      user: {
        id: "gov-user",
        tenantId: "gov-tenant",
      },
    },
  };
}

function createMaybeSingleBuilder(result: { data: unknown; error: { message: string } | null }) {
  const builder = {
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };

  return builder;
}

function createUpdateBuilder(result: { data: unknown; error: { message: string } | null }) {
  const builder = {
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };

  return builder;
}

function createInsertBuilder(result: { data: unknown; error: { message: string } | null }) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };

  return builder;
}

describe("admin exports routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("DELETE /api/admin/exports/[id] rejects requests without token", async () => {
    vi.mocked(requireAuthorized).mockResolvedValue({
      ok: false,
      response: unauthorizedResponse(),
    } as never);

    const request = new Request("http://localhost:3000/api/admin/exports/export-1", {
      method: "DELETE",
    });

    const response = await deleteAdminExportDetail(request, {
      params: Promise.resolve({ id: "export-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/admin/exports/[id] returns cross-tenant export detail for government admin", async () => {
    vi.mocked(requireAuthorized).mockResolvedValue(authorizedContext() as never);

    const exportSelectBuilder = createMaybeSingleBuilder({
      data: {
        id: "export-1",
        tenant_id: "producer-tenant",
        producer_id: "producer-1",
        upp_id: "upp-1",
        status: "requested",
        compliance_60_rule: true,
        tb_br_validated: true,
        blue_tag_assigned: false,
        monthly_bucket: "2026-04-01",
        metrics_json: { animal_ids: ["animal-1", "animal-2"] },
        blocked_reason: null,
        validated_by_mvz_user_id: null,
        approved_by_admin_user_id: null,
        created_at: "2026-04-10T00:00:00.000Z",
        updated_at: "2026-04-11T00:00:00.000Z",
        producers: { full_name: "Productor Uno" },
        upps: { upp_code: "UPP-001", name: "Rancho Norte" },
      },
      error: null,
    });

    vi.mocked(getSupabaseAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(exportSelectBuilder),
      }),
    } as never);

    const response = await getAdminExportDetail(
      new Request("http://localhost:3000/api/admin/exports/export-1"),
      { params: Promise.resolve({ id: "export-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.exportacion.id).toBe("export-1");
    expect(body.data.exportacion.producerName).toBe("Productor Uno");
    expect(exportSelectBuilder.eq).toHaveBeenCalledWith("id", "export-1");
    expect(exportSelectBuilder.eq).not.toHaveBeenCalledWith("tenant_id", "gov-tenant");
  });

  it("GET /api/admin/exports/[id] returns 404 when the export does not exist", async () => {
    vi.mocked(requireAuthorized).mockResolvedValue(authorizedContext() as never);

    const exportSelectBuilder = createMaybeSingleBuilder({
      data: null,
      error: null,
    });

    vi.mocked(getSupabaseAdminClient).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue(exportSelectBuilder),
      }),
    } as never);

    const response = await getAdminExportDetail(
      new Request("http://localhost:3000/api/admin/exports/missing-export"),
      { params: Promise.resolve({ id: "missing-export" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("ADMIN_EXPORT_NOT_FOUND");
  });

  it("PATCH /api/admin/exports/[id] updates using the export's real tenant", async () => {
    vi.mocked(requireAuthorized).mockResolvedValue(authorizedContext() as never);

    const exportSelectBuilder = createMaybeSingleBuilder({
      data: {
        id: "export-1",
        tenant_id: "producer-tenant",
      },
      error: null,
    });
    const updateBuilder = createUpdateBuilder({
      data: { id: "export-1" },
      error: null,
    });

    vi.mocked(getSupabaseAdminClient).mockReturnValue({
      from: vi
        .fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue(exportSelectBuilder),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue(updateBuilder),
        }),
    } as never);

    const response = await patchAdminExportDetail(
      new Request("http://localhost:3000/api/admin/exports/export-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "final_approved",
          complianceRule60: true,
        }),
      }),
      { params: Promise.resolve({ id: "export-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(updateBuilder.eq).toHaveBeenCalledWith("tenant_id", "producer-tenant");
    expect(updateBuilder.eq).not.toHaveBeenCalledWith("tenant_id", "gov-tenant");
  });

  it("DELETE /api/admin/exports/[id] soft deletes using the export's real tenant", async () => {
    vi.mocked(requireAuthorized).mockResolvedValue(authorizedContext() as never);

    const exportSelectBuilder = createMaybeSingleBuilder({
      data: {
        id: "export-1",
        tenant_id: "producer-tenant",
      },
      error: null,
    });
    const updateBuilder = createUpdateBuilder({
      data: { id: "export-1", status: "requested", deleted_at: "2026-04-14T00:00:00.000Z" },
      error: null,
    });

    vi.mocked(getSupabaseAdminClient).mockReturnValue({
      from: vi
        .fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue(exportSelectBuilder),
        })
        .mockReturnValueOnce({
          update: vi.fn().mockReturnValue(updateBuilder),
        }),
    } as never);

    const response = await deleteAdminExportDetail(
      new Request("http://localhost:3000/api/admin/exports/export-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "export-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(updateBuilder.eq).toHaveBeenCalledWith("tenant_id", "producer-tenant");
    expect(updateBuilder.eq).not.toHaveBeenCalledWith("tenant_id", "gov-tenant");
  });

  it("POST /api/admin/exports creates the export in the producer tenant resolved from the UPP", async () => {
    vi.mocked(requireAuthorized).mockResolvedValue(authorizedContext() as never);

    const uppSelectBuilder = createMaybeSingleBuilder({
      data: {
        id: "upp-1",
        tenant_id: "producer-tenant",
        producer_id: "producer-1",
      },
      error: null,
    });
    const insertBuilder = createInsertBuilder({
      data: {
        id: "export-1",
        producer_id: "producer-1",
        upp_id: "upp-1",
        status: "requested",
        compliance_60_rule: true,
        tb_br_validated: null,
        blue_tag_assigned: null,
        monthly_bucket: "2026-04-14",
        metrics_json: { animal_ids: ["animal-1"] },
        blocked_reason: null,
        created_at: "2026-04-14T00:00:00.000Z",
        updated_at: "2026-04-14T00:00:00.000Z",
      },
      error: null,
    });
    const insertSpy = vi.fn().mockReturnValue(insertBuilder);

    vi.mocked(getSupabaseAdminClient).mockReturnValue({
      from: vi
        .fn()
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue(uppSelectBuilder),
        })
        .mockReturnValueOnce({
          insert: insertSpy,
        }),
    } as never);

    const response = await postAdminExports(
      new Request("http://localhost:3000/api/admin/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uppId: "upp-1",
          producerId: "producer-1",
          compliance60Rule: true,
          metrics: { animal_ids: ["animal-1"] },
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.ok).toBe(true);
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: "producer-tenant",
        producer_id: "producer-1",
        upp_id: "upp-1",
        requested_by_user_id: "gov-user",
      })
    );
  });
});
