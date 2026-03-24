import { describe, expect, it } from "vitest";
import {
  GET as getMvzMembers,
  PATCH as patchMvzMembers,
  POST as postMvzMembers,
} from "../../src/app/api/mvz/members/route";

describe("mvz members route", () => {
  it("GET /api/mvz/members rejects requests without token", async () => {
    const response = await getMvzMembers(
      new Request("http://localhost:3000/api/mvz/members", { method: "GET" })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("POST /api/mvz/members rejects requests without token", async () => {
    const response = await postMvzMembers(
      new Request("http://localhost:3000/api/mvz/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "equipo@example.com", roleKey: "mvz_internal" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("PATCH /api/mvz/members rejects requests without token", async () => {
    const response = await patchMvzMembers(
      new Request("http://localhost:3000/api/mvz/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId: "membership-1", status: "suspended" }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});
