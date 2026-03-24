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

  it("uses normalized Spanish labels in producer and mvz navigation", () => {
    const producerNavigation = resolveWorkspaceNavigation(
      "producer",
      "organization",
      createUser({
        permissions: ["producer.dashboard.read", "producer.tenant.read"],
      }),
      null
    );
    const mvzNavigation = resolveWorkspaceNavigation(
      "mvz",
      "project",
      createUser({
        role: "mvz_government",
        roleKey: "mvz_government",
        roleName: "MVZ Gobierno",
        roleLabel: "MVZ Gobierno",
        permissions: [
          "mvz.ranch.read",
          "mvz.ranch.clinical.read",
          "mvz.ranch.vaccinations.read",
          "mvz.ranch.documents.read",
        ],
      }),
      "upp-1"
    );

    expect(producerNavigation.find((item) => item.key === "settings")?.label).toBe("Configuración");
    expect(mvzNavigation.find((item) => item.key === "overview")?.label).toBe("Resumen");
    expect(mvzNavigation.find((item) => item.key === "historial-clinico")?.label).toBe(
      "Historial clínico"
    );
    expect(mvzNavigation.find((item) => item.key === "vacunacion")?.label).toBe("Vacunación");
    expect(mvzNavigation.find((item) => item.key === "documentacion")?.label).toBe("Documentación");
  });
});
