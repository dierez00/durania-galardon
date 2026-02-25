import { describe, it, expect } from "vitest";
import { isAppRole, redirectPathForRole } from "../../src/shared/lib/auth";

describe("shared auth role helpers", () => {
  it("validates supported roles", () => {
    expect(isAppRole("admin")).toBe(true);
    expect(isAppRole("mvz")).toBe(true);
    expect(isAppRole("producer")).toBe(true);
    expect(isAppRole("ventanilla")).toBe(false);
  });

  it("returns redirect route by role", () => {
    expect(redirectPathForRole("admin")).toBe("/admin/panel");
    expect(redirectPathForRole("mvz")).toBe("/dashboard");
    expect(redirectPathForRole("producer")).toBe("/dashboard");
  });
});
