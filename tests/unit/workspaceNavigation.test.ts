import { describe, expect, it } from "vitest";
import { resolveWorkspaceNavigation } from "../../src/modules/workspace/presentation/navigation";
import type { WorkspaceUser } from "../../src/modules/workspace/domain/types";

function createUser(overrides: Partial<WorkspaceUser>): WorkspaceUser {
  return {
    email: "user@example.com",
    displayName: "Usuario",
    role: "producer",
    roleKey: "producer",
    roleName: "Productor",
    roleLabel: "Productor",
    isSystemRole: true,
    isMvzInternal: false,
    permissions: [],
    ...overrides,
  };
}

describe("resolveWorkspaceNavigation", () => {
  it("shows settings in producer with any settings permission", () => {
    const navigation = resolveWorkspaceNavigation(
      "producer",
      "organization",
      createUser({
        permissions: ["producer.roles.read"],
      }),
      null
    );

    expect(navigation.some((item) => item.key === "settings")).toBe(true);
    expect(navigation.some((item) => item.key === "projects")).toBe(false);
  });

  it("hides settings for mvz internal even if permissions are present", () => {
    const navigation = resolveWorkspaceNavigation(
      "mvz",
      "organization",
      createUser({
        role: "mvz_internal",
        roleKey: "mvz_internal",
        roleName: "MVZ Interno",
        roleLabel: "MVZ Interno",
        isMvzInternal: true,
        permissions: ["mvz.assignments.read", "mvz.roles.read", "mvz.members.read"],
      }),
      null
    );

    expect(navigation.some((item) => item.key === "projects")).toBe(true);
    expect(navigation.some((item) => item.key === "settings")).toBe(false);
  });
});
