import { describe, it, expect } from "vitest";
import {
  POST as adminProvisionCollar,
  GET as adminListCollars,
} from "../../src/app/api/admin/collars/route";
import { PATCH as adminUpdateCollarStatus } from "../../src/app/api/admin/collars/[collarId]/route";
import { GET as producerListCollars } from "../../src/app/api/producer/collars/route";
import { GET as producerGetCollarDetail } from "../../src/app/api/producer/collars/[collarId]/route";
import { POST as producerAssignCollar } from "../../src/app/api/producer/collars/[collarId]/assign/route";
import { POST as producerUnassignCollar } from "../../src/app/api/producer/collars/[collarId]/unassign/route";
import { GET as producerGetCollarHistory } from "../../src/app/api/producer/collars/[collarId]/history/route";

describe("collar routes - RBAC protection", () => {
  describe("POST /api/admin/collars - Provision Collar", () => {
    it("rejects requests without token", async () => {
      const request = new Request("http://localhost:3000/api/admin/collars", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          collar_id: "test-collar",
          firmware_version: "v1.0.0",
        }),
      });

      const response = await adminProvisionCollar(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("rejects requests with invalid JSON body", async () => {
      const request = new Request("http://localhost:3000/api/admin/collars", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "{ invalid json",
      });

      const response = await adminProvisionCollar(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("GET /api/admin/collars - List Collars", () => {
    it("rejects requests without token", async () => {
      const request = new Request(
        "http://localhost:3000/api/admin/collars?limit=50",
        {
          method: "GET",
        }
      );

      const response = await adminListCollars(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("PATCH /api/admin/collars/[collarId] - Update Collar Status", () => {
    it("rejects requests without token", async () => {
      const request = new Request(
        "http://localhost:3000/api/admin/collars/collar-123",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "suspended",
            notes: "Test suspension",
          }),
        }
      );

      const response = await adminUpdateCollarStatus(request, {
        params: Promise.resolve({ collarId: "collar-123" }),
      });
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("GET /api/producer/collars - List Producer Collars", () => {
    it("rejects requests without token", async () => {
      const request = new Request("http://localhost:3000/api/producer/collars", {
        method: "GET",
      });

      const response = await producerListCollars(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("GET /api/producer/collars/[collarId] - Get Collar Detail", () => {
    it("rejects requests without token", async () => {
      const request = new Request(
        "http://localhost:3000/api/producer/collars/collar-123",
        {
          method: "GET",
        }
      );

      const response = await producerGetCollarDetail(request, {
        params: Promise.resolve({ collarId: "collar-123" }),
      });
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("POST /api/producer/collars/[collarId]/assign - Assign Collar", () => {
    it("rejects requests without token", async () => {
      const request = new Request(
        "http://localhost:3000/api/producer/collars/collar-123/assign",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            animal_id: "bovino-456",
            linked_by: "profile-789",
          }),
        }
      );

      const response = await producerAssignCollar(request, {
        params: Promise.resolve({ collarId: "collar-123" }),
      });
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("POST /api/producer/collars/[collarId]/unassign - Unassign Collar", () => {
    it("rejects requests without token", async () => {
      const request = new Request(
        "http://localhost:3000/api/producer/collars/collar-123/unassign",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            unlinked_by: "profile-789",
          }),
        }
      );

      const response = await producerUnassignCollar(request, {
        params: Promise.resolve({ collarId: "collar-123" }),
      });
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("GET /api/producer/collars/[collarId]/history - Collar History", () => {
    it("rejects requests without token", async () => {
      const request = new Request(
        "http://localhost:3000/api/producer/collars/collar-123/history",
        {
          method: "GET",
        }
      );

      const response = await producerGetCollarHistory(request, {
        params: Promise.resolve({ collarId: "collar-123" }),
      });
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });
});
