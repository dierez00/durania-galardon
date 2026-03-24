import { describe, expect, it } from "vitest";
import { generateTemporaryPassword } from "../../src/server/admin/provisioning";

describe("admin provisioning helpers", () => {
  it("genera password temporal con longitud esperada", () => {
    const password = generateTemporaryPassword(16);
    expect(password).toHaveLength(16);
  });

  it("genera passwords diferentes en dos llamadas", () => {
    const a = generateTemporaryPassword(14);
    const b = generateTemporaryPassword(14);
    expect(a).not.toBe(b);
  });
});
