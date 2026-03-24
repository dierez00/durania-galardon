import { describe, expect, it } from "vitest";
import { documentDeletionPolicy } from "../../src/modules/producer/documents/domain/services/documentDeletionPolicy";

describe("documentDeletionPolicy", () => {
  it("bloquea documentos validados", () => {
    expect(
      documentDeletionPolicy.canDelete({
        isCurrent: true,
        status: "validated",
        hasOtherVersion: true,
      })
    ).toBe(false);
  });

  it("bloquea cuando no existe otra version", () => {
    expect(
      documentDeletionPolicy.canDelete({
        isCurrent: true,
        status: "pending",
        hasOtherVersion: false,
      })
    ).toBe(false);
    expect(
      documentDeletionPolicy.canDelete({
        isCurrent: false,
        status: "rejected",
        hasOtherVersion: false,
      })
    ).toBe(false);
  });

  it("bloquea vencido sin otra version", () => {
    expect(
      documentDeletionPolicy.canDelete({
        isCurrent: true,
        status: "expired",
        hasOtherVersion: false,
      })
    ).toBe(false);
  });

  it("permite no validado cuando existe otra version", () => {
    expect(
      documentDeletionPolicy.canDelete({
        isCurrent: true,
        status: "pending",
        hasOtherVersion: true,
      })
    ).toBe(true);
    expect(
      documentDeletionPolicy.canDelete({
        isCurrent: false,
        status: "expired",
        hasOtherVersion: true,
      })
    ).toBe(true);
  });
});
