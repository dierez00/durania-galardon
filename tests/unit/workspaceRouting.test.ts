import { describe, expect, it } from "vitest";
import { resolveWorkspaceLocation } from "../../src/modules/workspace/presentation/workspace-routing";

describe("resolveWorkspaceLocation", () => {
  it("captures mvz animal detail routes as project detail locations", () => {
    const location = resolveWorkspaceLocation("/mvz/ranchos/upp-1/animales/animal-9");

    expect(location).toMatchObject({
      panel: "mvz",
      mode: "project",
      projectId: "upp-1",
      moduleKey: "animales",
      detailId: "animal-9",
    });
  });

  it("keeps standard project tabs without detail id", () => {
    const location = resolveWorkspaceLocation("/producer/projects/upp-2/exportaciones");

    expect(location).toMatchObject({
      panel: "producer",
      mode: "project",
      projectId: "upp-2",
      moduleKey: "exportaciones",
      detailId: null,
    });
  });
});
