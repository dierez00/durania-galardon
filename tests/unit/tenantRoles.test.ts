import { describe, expect, it } from "vitest";
import {
  getDefaultRoleKeyForPanel,
  getVisibleSystemRoleKeys,
  isVisibleRoleForPanel,
} from "../../src/server/authz/tenantRoles";

describe("tenant role panel helpers", () => {
  it("exposes tenant_admin as the only visible system role for admin", () => {
    expect(getVisibleSystemRoleKeys("admin")).toEqual(["tenant_admin"]);
    expect(getDefaultRoleKeyForPanel("admin")).toBe("tenant_admin");
  });

  it("keeps custom roles visible for admin and hides foreign system roles", () => {
    expect(isVisibleRoleForPanel("admin", { key: "custom_supervisor", is_system: false })).toBe(true);
    expect(isVisibleRoleForPanel("admin", { key: "tenant_admin", is_system: true })).toBe(true);
    expect(isVisibleRoleForPanel("admin", { key: "producer", is_system: true })).toBe(false);
  });
});
