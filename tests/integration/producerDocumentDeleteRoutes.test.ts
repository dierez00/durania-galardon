import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("../../src/server/authz", () => ({
  requireAuthorized: vi.fn(),
}));

vi.mock("../../src/server/auth/supabase", () => ({
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock("../../src/server/audit", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

import { requireAuthorized } from "../../src/server/authz";
import { getSupabaseAdminClient } from "../../src/server/auth/supabase";
import { DELETE as deleteProducerDocument } from "../../src/app/api/producer/documents/[id]/route";
import { DELETE as deleteUppDocument } from "../../src/app/api/producer/upp-documents/[id]/route";

function createSupabaseMock(document: Record<string, unknown>, hasOtherVersion: boolean) {
  const docSelectBuilder = {
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: document, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: document, error: null }),
  };

  const otherSelectBuilder = {
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({
      data: hasOtherVersion ? [{ id: "other-doc" }] : [],
      error: null,
    }),
  };

  const deleteEq = vi.fn().mockResolvedValue({ error: null });
  const deleteBuilder = {
    eq: deleteEq,
  };

  const from = vi
    .fn()
    .mockReturnValueOnce({
      select: vi.fn(() => docSelectBuilder),
    })
    .mockReturnValueOnce({
      select: vi.fn(() => otherSelectBuilder),
    })
    .mockReturnValueOnce({
      select: vi.fn(() => docSelectBuilder),
    })
    .mockReturnValue({
      delete: vi.fn(() => deleteBuilder),
    });

  const storageRemove = vi.fn().mockResolvedValue({ error: null });

  const client = {
    from,
    storage: {
      from: vi.fn(() => ({
        remove: storageRemove,
      })),
    },
  };

  return { client, deleteEq, storageRemove };
}

describe("producer delete document routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bloquea DELETE personal cuando esta validado", async () => {
    const { client, deleteEq } = createSupabaseMock(
      {
        id: "doc-1",
        producer_id: "producer-1",
        document_type_id: "type-ine",
        file_storage_key: "tenant/personal/file.pdf",
        is_current: true,
        status: "validated",
        tenant_id: "tenant-1",
      },
      true
    );

    vi.mocked(requireAuthorized).mockResolvedValue({
      ok: true,
      context: {
        user: { tenantId: "tenant-1", id: "user-1" },
        canAccessUpp: vi.fn().mockResolvedValue(true),
      },
    } as never);
    vi.mocked(getSupabaseAdminClient).mockReturnValue(client as never);

    const response = await deleteProducerDocument(
      new NextRequest("http://localhost/api/producer/documents/doc-1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "doc-1" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("DELETION_BLOCKED");
    expect(deleteEq).not.toHaveBeenCalled();
  });

  it("permite DELETE personal pending aunque solo exista una version", async () => {
    const { client, deleteEq, storageRemove } = createSupabaseMock(
      {
        id: "doc-2",
        producer_id: "producer-1",
        document_type_id: "type-curp",
        file_storage_key: "tenant/personal/file-only.pdf",
        is_current: false,
        status: "pending",
        tenant_id: "tenant-1",
      },
      false
    );

    vi.mocked(requireAuthorized).mockResolvedValue({
      ok: true,
      context: {
        user: { tenantId: "tenant-1", id: "user-1" },
        canAccessUpp: vi.fn().mockResolvedValue(true),
      },
    } as never);
    vi.mocked(getSupabaseAdminClient).mockReturnValue(client as never);

    const response = await deleteProducerDocument(
      new NextRequest("http://localhost/api/producer/documents/doc-2", { method: "DELETE" }),
      { params: Promise.resolve({ id: "doc-2" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(deleteEq).toHaveBeenCalled();
    expect(storageRemove).toHaveBeenCalled();
  });

  it("permite DELETE personal no validado cuando existe otra version", async () => {
    const { client, deleteEq, storageRemove } = createSupabaseMock(
      {
        id: "doc-3",
        producer_id: "producer-1",
        document_type_id: "type-curp",
        file_storage_key: "tenant/personal/file-old.pdf",
        is_current: false,
        status: "rejected",
        tenant_id: "tenant-1",
      },
      true
    );

    vi.mocked(requireAuthorized).mockResolvedValue({
      ok: true,
      context: {
        user: { tenantId: "tenant-1", id: "user-1" },
        canAccessUpp: vi.fn().mockResolvedValue(true),
      },
    } as never);
    vi.mocked(getSupabaseAdminClient).mockReturnValue(client as never);

    const response = await deleteProducerDocument(
      new NextRequest("http://localhost/api/producer/documents/doc-3", { method: "DELETE" }),
      { params: Promise.resolve({ id: "doc-3" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(deleteEq).toHaveBeenCalled();
    expect(storageRemove).toHaveBeenCalled();
  });

  it("bloquea DELETE UPP vencido si no existe otra version", async () => {
    const { client, deleteEq } = createSupabaseMock(
      {
        id: "doc-4",
        upp_id: "upp-1",
        document_type: "constancia_upp",
        file_storage_key: "tenant/upp/file-expired.pdf",
        is_current: true,
        status: "expired",
        tenant_id: "tenant-1",
      },
      false
    );

    vi.mocked(requireAuthorized).mockResolvedValue({
      ok: true,
      context: {
        user: { tenantId: "tenant-1", id: "user-1" },
        canAccessUpp: vi.fn().mockResolvedValue(true),
      },
    } as never);
    vi.mocked(getSupabaseAdminClient).mockReturnValue(client as never);

    const response = await deleteUppDocument(
      new NextRequest("http://localhost/api/producer/upp-documents/doc-4", { method: "DELETE" }),
      { params: Promise.resolve({ id: "doc-4" }) }
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("DELETION_BLOCKED");
    expect(deleteEq).not.toHaveBeenCalled();
  });
});
