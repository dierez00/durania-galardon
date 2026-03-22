import { describe, it, expect } from "vitest";
import { isAppRole, isPermissionKey, redirectPathForRole } from "../../src/shared/lib/auth";

describe("shared auth role helpers", () => {
  it("validates supported roles", () => {
    expect(isAppRole("tenant_admin")).toBe(true);
    expect(isAppRole("mvz_government")).toBe(true);
    expect(isAppRole("mvz_internal")).toBe(true);
    expect(isAppRole("producer")).toBe(true);
    expect(isAppRole("employee")).toBe(true);
    expect(isAppRole("producer_viewer")).toBe(true);
    expect(isAppRole("ventanilla")).toBe(false);
  });

  it("returns redirect route by role", () => {
    expect(redirectPathForRole("tenant_admin")).toBe("/admin");
    expect(redirectPathForRole("mvz_government")).toBe("/mvz");
    expect(redirectPathForRole("mvz_internal")).toBe("/mvz");
    expect(redirectPathForRole("producer")).toBe("/producer");
    expect(redirectPathForRole("employee")).toBe("/producer");
    expect(redirectPathForRole("producer_viewer")).toBe("/producer");
  });

  it("validates permission keys", () => {
    expect(isPermissionKey("admin.dashboard.read")).toBe(true);
    expect(isPermissionKey("mvz.tests.sync")).toBe(true);
    expect(isPermissionKey("mvz.members.write")).toBe(true);
    expect(isPermissionKey("mvz.profile.write")).toBe(true);
    expect(isPermissionKey("producer.documents.write")).toBe(true);
    expect(isPermissionKey("producer.tenant.read")).toBe(true);
    expect(isPermissionKey("admin.superpower")).toBe(false);
  });
});
