"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { SanitarioBadge } from "@/modules/bovinos/presentation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { fetchMvzRanchClinical } from "./mvzRanchApi";
import { formatDate } from "./formatters";
import { EmptyState, ErrorState, LoadingState, MetricCard, SectionHeading } from "./shared";
import type { MvzRanchClinicalRecord, MvzRanchTabProps } from "./types";

export function MvzRanchClinicalView({
  uppId,
  refreshKey,
}: Readonly<MvzRanchTabProps>) {
  const [tests, setTests] = useState<MvzRanchClinicalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchMvzRanchClinical(uppId);
        if (!cancelled) {
          setTests(data.tests);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "No fue posible cargar historial clínico.");
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

  const positiveTests = useMemo(
    () => tests.filter((test) => test.result === "positive").length,
    [tests]
  );

  const expiringTests = useMemo(
    () =>
      tests.filter((test) => {
        if (!test.valid_until) {
          return false;
        }
        const validityDate = new Date(test.valid_until).getTime();
        return validityDate <= Date.now() + 1000 * 60 * 60 * 24 * 14;
      }).length,
    [tests]
  );

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Historial clínico"
        description="Pruebas de campo y vigencias sanitarias capturadas para el rancho."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pruebas registradas" value={tests.length} />
        <MetricCard label="Positivas" value={positiveTests} />
        <MetricCard label="Por vencer" value={expiringTests} />
        <MetricCard label="Última muestra" value={formatDate(tests[0]?.sample_date)} />
      </div>

      {error ? <ErrorState message={error} /> : null}
      {loading ? <LoadingState label="Cargando historial clínico..." /> : null}

      {!loading && !error && tests.length === 0 ? (
        <EmptyState
          title="Sin pruebas registradas"
          description="Aquí aparecerán las pruebas de campo asociadas a los animales del rancho."
        />
      ) : null}

      {!loading && !error && tests.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Pruebas TB / BR</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Animal</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Muestra</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Ubicación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((test) => (
                  <TableRow key={test.id}>
                    <TableCell className="font-mono text-xs">{test.animal_id}</TableCell>
                    <TableCell className="uppercase">{test.test_type_id}</TableCell>
                    <TableCell>{formatDate(test.sample_date)}</TableCell>
                    <TableCell>
                      <SanitarioBadge estado={test.result} />
                    </TableCell>
                    <TableCell>{formatDate(test.valid_until)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {test.captured_lat != null && test.captured_lng != null
                        ? `${test.captured_lat.toFixed(4)}, ${test.captured_lng.toFixed(4)}`
                        : "Sin coordenadas"}
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
