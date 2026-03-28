import { describe, expect, it } from "vitest";
import { DELETE as deleteAdminExportDetail } from "../../src/app/api/admin/exports/[id]/route";

describe("admin exports routes", () => {
  it("DELETE /api/admin/exports/[id] rejects requests without token", async () => {
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
});
