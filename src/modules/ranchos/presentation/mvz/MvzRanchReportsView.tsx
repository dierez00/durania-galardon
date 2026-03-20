"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { fetchMvzRanchReports } from "./mvzRanchApi";
import { EmptyState, ErrorState, LoadingState, MetricCard, SectionHeading, StatusChip, ViewModeToggle } from "./shared";
import { useSessionViewMode } from "./useSessionViewMode";
import type { MvzRanchReportRow, MvzRanchTabProps } from "./types";

export function MvzRanchReportsView({
  uppId,
  refreshKey,
}: Readonly<MvzRanchTabProps>) {
  const [reports, setReports] = useState<MvzRanchReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { viewMode, setViewMode } = useSessionViewMode(`mvz:ranch:${uppId}:reportes:view`);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchMvzRanchReports(uppId);
        if (!cancelled) {
          setReports(data.reports);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "No fue posible cargar reportes.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, uppId]);

  const summary = useMemo(
    () => ({
      critical: reports.filter((row) => row.status === "critical").length,
      attention: reports.filter((row) => row.status === "attention").length,
      stable: reports.filter((row) => row.status === "stable").length,
    }),
    [reports]
  );

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Reportes"
        description="Matriz operativa por categoría para exportaciones, movilizaciones, pruebas e incidencias."
        actions={<ViewModeToggle mode={viewMode} onChange={setViewMode} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Categorías" value={reports.length} />
        <MetricCard label="Estables" value={summary.stable} />
        <MetricCard label="Seguimiento" value={summary.attention} />
        <MetricCard label="Críticas" value={summary.critical} />
      </div>

      {error ? <ErrorState message={error} /> : null}
      {loading ? <LoadingState label="Cargando reportes..." /> : null}

      {!loading && !error && reports.length === 0 ? (
        <EmptyState
          title="Sin reportes disponibles"
          description="El resumen operativo aparecerá aquí en cuanto existan datos agregados del rancho."
        />
      ) : null}

      {!loading && !error && reports.length > 0 && viewMode === "card" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">{report.label}</CardTitle>
                  <StatusChip label={report.statusLabel} tone={report.status} />
                </div>
                <p className="text-sm text-muted-foreground">{report.description}</p>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {report.primaryMetricLabel}
                  </p>
                  <p className="mt-1 text-2xl font-semibold">{report.primaryMetricValue}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {report.secondaryMetricLabel}
                  </p>
                  <p className="mt-1 text-2xl font-semibold">{report.secondaryMetricValue}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {report.tertiaryMetricLabel}
                  </p>
                  <p className="mt-1 text-2xl font-semibold">{report.tertiaryMetricValue}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {!loading && !error && reports.length > 0 && viewMode === "table" ? (
        <Card>
          <CardHeader>
            <CardTitle>Matriz de categorías</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Métrica principal</TableHead>
                  <TableHead>Métrica secundaria</TableHead>
                  <TableHead>Métrica de balance</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.label}</TableCell>
                    <TableCell className="max-w-sm whitespace-normal text-sm text-muted-foreground">
                      {report.description}
                    </TableCell>
                    <TableCell>{`${report.primaryMetricLabel}: ${report.primaryMetricValue}`}</TableCell>
                    <TableCell>{`${report.secondaryMetricLabel}: ${report.secondaryMetricValue}`}</TableCell>
                    <TableCell>{`${report.tertiaryMetricLabel}: ${report.tertiaryMetricValue}`}</TableCell>
                    <TableCell>
                      <StatusChip label={report.statusLabel} tone={report.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
