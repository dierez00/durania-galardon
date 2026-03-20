import { describe, expect, it } from "vitest";
import { normalizeMvzRanchReports } from "../../src/modules/ranchos/application/use-cases/normalizeMvzRanchReports";

describe("normalizeMvzRanchReports", () => {
  it("returns four fixed report rows with derived status and balance metrics", () => {
    const rows = normalizeMvzRanchReports({
      upp_id: "upp-1",
      upp_name: "Rancho Norte",
      exports_requested: 8,
      exports_validated: 5,
      exports_blocked: 2,
      movements_requested: 7,
      movements_approved: 4,
      tests_total_90d: 12,
      positive_tests_90d: 1,
      incidents_open: 3,
      incidents_resolved_30d: 6,
    });

    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.id)).toEqual([
      "exportaciones",
      "movilizaciones",
      "pruebas",
      "incidencias",
    ]);
    expect(rows[0]).toMatchObject({
      tertiaryMetricLabel: "Bloqueadas",
      tertiaryMetricValue: 2,
      status: "critical",
    });
    expect(rows[1]).toMatchObject({
      tertiaryMetricLabel: "Pendientes",
      tertiaryMetricValue: 3,
      status: "attention",
    });
    expect(rows[2]).toMatchObject({
      secondaryMetricValue: 1,
      status: "critical",
    });
    expect(rows[3]).toMatchObject({
      tertiaryMetricValue: 3,
      status: "critical",
    });
  });
});
