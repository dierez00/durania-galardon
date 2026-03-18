import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET as getDocuments } from "../../src/app/api/producer/documents/route";
import { POST as postEmployee } from "../../src/app/api/producer/employees/route";
import { PATCH as patchEmployee } from "../../src/app/api/producer/employees/route";
import { DELETE as deleteUppDocument } from "../../src/app/api/producer/upp-documents/[id]/route";

describe("producer employees/documents routes", () => {
  it("GET /api/producer/documents rejects requests without token", async () => {
    const request = new Request("http://localhost:3000/api/producer/documents", {
      method: "GET",
    });

    const response = await getDocuments(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("POST /api/producer/employees rejects requests without token", async () => {
    const request = new Request("http://localhost:3000/api/producer/employees", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "empleado@example.com",
        uppIds: ["upp-a"],
      }),
    });

    const response = await postEmployee(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("PATCH /api/producer/employees rejects requests without token", async () => {
    const request = new Request("http://localhost:3000/api/producer/employees", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        membershipId: "membership-1",
        status: "inactive",
      }),
    });

    const response = await patchEmployee(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("DELETE /api/producer/upp-documents/:id rejects requests without token", async () => {
    const request = new NextRequest("http://localhost:3000/api/producer/upp-documents/doc-1", {
      method: "DELETE",
    });

    const response = await deleteUppDocument(request, {
      params: Promise.resolve({ id: "doc-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
