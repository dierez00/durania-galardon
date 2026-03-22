import { describe, it, expect } from "vitest";
import {
  deriveCompatibleRole,
  isAppRole,
  isPermissionKey,
  MVZ_SETTINGS_NAV_PERMISSIONS,
  PRODUCER_SETTINGS_NAV_PERMISSIONS,
  redirectPathForRole,
  resolvePanelHomePath,
} from "../../src/shared/lib/auth";

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
    expect(isPermissionKey("producer.roles.write")).toBe(true);
    expect(isPermissionKey("mvz.roles.write")).toBe(true);
    expect(isPermissionKey("producer.tenant.read")).toBe(true);
    expect(isPermissionKey("admin.superpower")).toBe(false);
  });

  it("derives compatible panel roles for custom tenant roles", () => {
    expect(deriveCompatibleRole("producer", "custom_operador")).toBe("producer");
    expect(deriveCompatibleRole("mvz", "custom_supervisor")).toBe("mvz_government");
    expect(deriveCompatibleRole("mvz", "mvz_internal")).toBe("mvz_internal");
  });

  it("resolves panel home paths from permissions", () => {
    expect(
      resolvePanelHomePath({
        panelType: "producer",
        permissions: ["producer.roles.read"],
      })
    ).toBe("/producer/settings");

    expect(
      resolvePanelHomePath({
        panelType: "mvz",
        permissions: ["mvz.roles.write"],
      })
    ).toBe("/mvz/settings");

    expect(
      resolvePanelHomePath({
        panelType: "mvz",
        permissions: ["mvz.assignments.read"],
        isMvzInternal: true,
      })
    ).toBe("/mvz");
  });

  it("keeps settings navigation permissions aligned with tab access", () => {
    expect(PRODUCER_SETTINGS_NAV_PERMISSIONS).toEqual(
      expect.arrayContaining(["producer.tenant.write", "producer.employees.write", "producer.roles.write"])
    );
    expect(MVZ_SETTINGS_NAV_PERMISSIONS).toEqual(
      expect.arrayContaining(["mvz.tenant.write", "mvz.members.write", "mvz.roles.write"])
    );
  });
});
