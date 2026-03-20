export interface MvzRanchReportSnapshot {
  upp_id: string;
  upp_name: string;
  exports_requested: number;
  exports_validated: number;
  exports_blocked: number;
  movements_requested: number;
  movements_approved: number;
  tests_total_90d: number;
  positive_tests_90d: number;
  incidents_open: number;
  incidents_resolved_30d: number;
}

export interface MvzRanchReportRow {
  id: "exportaciones" | "movilizaciones" | "pruebas" | "incidencias";
  label: string;
  description: string;
  primaryMetricLabel: string;
  primaryMetricValue: number;
  secondaryMetricLabel: string;
  secondaryMetricValue: number;
  tertiaryMetricLabel: string;
  tertiaryMetricValue: number;
  status: "stable" | "attention" | "critical";
  statusLabel: string;
}

function resolveStatus(
  criticalValue: number,
  warningValue: number
): Pick<MvzRanchReportRow, "status" | "statusLabel"> {
  if (criticalValue > 0) {
    return { status: "critical", statusLabel: "Atención inmediata" };
  }

  if (warningValue > 0) {
    return { status: "attention", statusLabel: "Seguimiento activo" };
  }

  return { status: "stable", statusLabel: "Estable" };
}

export function normalizeMvzRanchReports(
  report: MvzRanchReportSnapshot
): MvzRanchReportRow[] {
  return [
    {
      id: "exportaciones",
      label: "Exportaciones",
      description: "Seguimiento de solicitudes y bloqueos sanitarios del rancho.",
      primaryMetricLabel: "Solicitudes",
      primaryMetricValue: report.exports_requested,
      secondaryMetricLabel: "Validadas",
      secondaryMetricValue: report.exports_validated,
      tertiaryMetricLabel: "Bloqueadas",
      tertiaryMetricValue: report.exports_blocked,
      ...resolveStatus(report.exports_blocked, report.exports_requested - report.exports_validated),
    },
    {
      id: "movilizaciones",
      label: "Movilizaciones",
      description: "Estado operativo de movimientos en espera y aprobaciones.",
      primaryMetricLabel: "Solicitadas",
      primaryMetricValue: report.movements_requested,
      secondaryMetricLabel: "Aprobadas",
      secondaryMetricValue: report.movements_approved,
      tertiaryMetricLabel: "Pendientes",
      tertiaryMetricValue: Math.max(report.movements_requested - report.movements_approved, 0),
      ...resolveStatus(
        0,
        Math.max(report.movements_requested - report.movements_approved, 0)
      ),
    },
    {
      id: "pruebas",
      label: "Pruebas sanitarias",
      description: "Actividad diagnóstica del rancho en los últimos 90 días.",
      primaryMetricLabel: "Totales 90d",
      primaryMetricValue: report.tests_total_90d,
      secondaryMetricLabel: "Positivas 90d",
      secondaryMetricValue: report.positive_tests_90d,
      tertiaryMetricLabel: "Negativas/otras",
      tertiaryMetricValue: Math.max(report.tests_total_90d - report.positive_tests_90d, 0),
      ...resolveStatus(report.positive_tests_90d, 0),
    },
    {
      id: "incidencias",
      label: "Incidencias",
      description: "Incidencias abiertas y cierres recientes del equipo MVZ.",
      primaryMetricLabel: "Abiertas",
      primaryMetricValue: report.incidents_open,
      secondaryMetricLabel: "Resueltas 30d",
      secondaryMetricValue: report.incidents_resolved_30d,
      tertiaryMetricLabel: "Balance",
      tertiaryMetricValue: report.incidents_resolved_30d - report.incidents_open,
      ...resolveStatus(report.incidents_open, 0),
    },
  ];
}
