import { describe, expect, it } from "vitest";
import {
  getIncidentSeverityMeta,
  getIncidentStatusMeta,
} from "../../src/modules/ranchos/presentation/mvz/incidentBadges";

describe("incidentBadges", () => {
  it("maps incident statuses to the expected labels and tones", () => {
    expect(getIncidentStatusMeta("open")).toEqual({ label: "Abierta", tone: "error" });
    expect(getIncidentStatusMeta("in_progress")).toEqual({
      label: "En seguimiento",
      tone: "warning",
    });
    expect(getIncidentStatusMeta("resolved")).toEqual({ label: "Resuelta", tone: "success" });
    expect(getIncidentStatusMeta("dismissed")).toEqual({ label: "Descartada", tone: "neutral" });
  });

  it("keeps severity badges separate from status badges", () => {
    expect(getIncidentSeverityMeta("low")).toEqual({ label: "Baja", tone: "neutral" });
    expect(getIncidentSeverityMeta("medium")).toEqual({ label: "Media", tone: "info" });
    expect(getIncidentSeverityMeta("high")).toEqual({ label: "Alta", tone: "warning" });
    expect(getIncidentSeverityMeta("critical")).toEqual({ label: "Crítica", tone: "error" });
  });
});
