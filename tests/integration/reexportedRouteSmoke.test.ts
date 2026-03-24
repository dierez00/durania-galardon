import { describe, expect, it } from "vitest";
import { GET as getAdminProducers } from "../../src/app/api/admin/producers/route";
import { GET as getAdminMvz } from "../../src/app/api/admin/mvz/route";
import { GET as getProducerBovinos } from "../../src/app/api/producer/bovinos/route";
import { GET as getProducerUpps } from "../../src/app/api/producer/upp/route";

describe("reexported route smoke tests", () => {
  it("GET /api/admin/producers keeps auth guard through module reexport", async () => {
    const response = await getAdminProducers(
      new Request("http://localhost:3000/api/admin/producers", { method: "GET" })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/admin/mvz keeps auth guard through module reexport", async () => {
    const response = await getAdminMvz(
      new Request("http://localhost:3000/api/admin/mvz", { method: "GET" })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/producer/bovinos keeps auth guard through module reexport", async () => {
    const response = await getProducerBovinos(
      new Request("http://localhost:3000/api/producer/bovinos", { method: "GET" })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("GET /api/producer/upp keeps auth guard through module reexport", async () => {
    const response = await getProducerUpps(
      new Request("http://localhost:3000/api/producer/upp", { method: "GET" })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
