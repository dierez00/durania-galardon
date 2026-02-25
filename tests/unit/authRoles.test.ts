import { describe, it, expect } from "vitest";
import { isAppRole, isPermissionKey, redirectPathForRole } from "../../src/shared/lib/auth";

describe("shared auth role helpers", () => {
  it("validates supported roles", () => {
    expect(isAppRole("tenant_admin")).toBe(true);
    expect(isAppRole("mvz_government")).toBe(true);
    expect(isAppRole("mvz_internal")).toBe(true);
    expect(isAppRole("producer")).toBe(true);
    expect(isAppRole("employee")).toBe(true);
    expect(isAppRole("ventanilla")).toBe(false);
  });

  it("returns redirect route by role", () => {
    expect(redirectPathForRole("tenant_admin")).toBe("/admin/panel");
    expect(redirectPathForRole("mvz_government")).toBe("/mvz/dashboard");
    expect(redirectPathForRole("mvz_internal")).toBe("/mvz/dashboard");
    expect(redirectPathForRole("producer")).toBe("/producer/dashboard");
    expect(redirectPathForRole("employee")).toBe("/producer/dashboard");
  });

  it("validates permission keys", () => {
    expect(isPermissionKey("admin.dashboard.read")).toBe(true);
    expect(isPermissionKey("mvz.tests.sync")).toBe(true);
    expect(isPermissionKey("producer.profile.write")).toBe(true);
    expect(isPermissionKey("admin.superpower")).toBe(false);
  });
});
