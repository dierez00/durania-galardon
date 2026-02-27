import { describe, expect, it } from "vitest";
import { POST as postProducerBatch } from "../../src/app/api/admin/producers/batch/route";
import { POST as postMvzBatch } from "../../src/app/api/admin/mvz/batch/route";

describe("admin batch routes", () => {
  it("POST /api/admin/producers/batch rejects requests without token", async () => {
    const request = new Request("http://localhost:3000/api/admin/producers/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: [{ email: "a@a.com", fullName: "Test" }],
        options: { atomic: true },
      }),
    });

    const response = await postProducerBatch(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("POST /api/admin/mvz/batch rejects requests without token", async () => {
    const request = new Request("http://localhost:3000/api/admin/mvz/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: [{ email: "a@a.com", fullName: "MVZ Test", licenseNumber: "LIC123" }],
        options: { atomic: true, roleKey: "mvz_government" },
      }),
    });

    const response = await postMvzBatch(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
