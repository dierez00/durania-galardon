"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { SanitarioBadge } from "@/modules/bovinos/presentation";
import { useMvzRanchContext, useMvzRealtime } from "@/modules/ranchos/presentation/mvz";
import { MVZ_RANCH_TABS } from "./constants";
import { fetchMvzRanchOverview } from "./mvzRanchApi";
import { formatDate } from "./formatters";
import { MvzRanchAnimalsView } from "./MvzRanchAnimalsView";
import { MvzRanchClinicalView } from "./MvzRanchClinicalView";
import { MvzRanchDocumentsView } from "./MvzRanchDocumentsView";
import { MvzRanchIncidentsView } from "./MvzRanchIncidentsView";
import { MvzRanchOverviewView } from "./MvzRanchOverviewView";
import { MvzRanchReportsView } from "./MvzRanchReportsView";
import { MvzRanchVaccinationView } from "./MvzRanchVaccinationView";
import { MvzRanchVisitsView } from "./MvzRanchVisitsView";
import type { MvzRanchTab, RanchOverview } from "./types";

function isMvzRanchTab(tab: string): tab is MvzRanchTab {
  return MVZ_RANCH_TABS.some((item) => item.id === tab);
}

export default function RanchPanel({ tab }: { tab: string }) {
  const params = useParams<{ uppId: string }>();
  const uppId = params.uppId;
  const { setSelectedUppId } = useMvzRanchContext();
  const [overview, setOverview] = useState<RanchOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const selectedTab = useMemo<MvzRanchTab>(() => {
    return isMvzRanchTab(tab) ? tab : "resumen";
  }, [tab]);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const data = await fetchMvzRanchOverview(uppId);
      setOverview(data.overview);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "No fue posible cargar el contexto del rancho."
      );
    } finally {
      setLoading(false);
    }
  }, [uppId]);

  useEffect(() => {
    setSelectedUppId(uppId);
  }, [setSelectedUppId, uppId]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useMvzRealtime({
    uppId,
    onEvent: () => {
      void loadOverview();
      setRefreshKey((current) => current + 1);
    },
  });

  const contentProps = overview ? { uppId, overview, refreshKey } : null;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Panel MVZ del rancho</p>
            <h1 className="text-3xl font-semibold">
              {overview?.upp_name ?? "Cargando rancho..."}
            </h1>
            <p className="text-sm text-muted-foreground">
              {overview?.producer_name
                ? `${overview.producer_name}${overview.upp_code ? ` · ${overview.upp_code}` : ""}`
                : "Seguimiento clínico, documental y operativo del rancho seleccionado."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {overview?.upp_status ? <SanitarioBadge estado={overview.upp_status} /> : null}
            {overview?.sanitary_alert ? <SanitarioBadge estado={overview.sanitary_alert} /> : null}
          </div>
        </div>

        {overview ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Animales activos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{overview.active_animals}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">En tratamiento</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{overview.animals_in_treatment}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Vacunaciones pendientes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{overview.pending_vaccinations}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Incidencias activas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{overview.active_incidents}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Última inspección</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{formatDate(overview.last_inspection_at)}</p>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      {loading && !overview ? (
        <p className="text-sm text-muted-foreground">Cargando contexto del rancho...</p>
      ) : null}

      {overview && contentProps ? (
        <>
          {selectedTab === "resumen" ? <MvzRanchOverviewView {...contentProps} /> : null}
          {selectedTab === "animales" ? <MvzRanchAnimalsView {...contentProps} /> : null}
          {selectedTab === "historial-clinico" ? <MvzRanchClinicalView {...contentProps} /> : null}
          {selectedTab === "vacunacion" ? <MvzRanchVaccinationView {...contentProps} /> : null}
          {selectedTab === "incidencias" ? <MvzRanchIncidentsView {...contentProps} /> : null}
          {selectedTab === "reportes" ? <MvzRanchReportsView {...contentProps} /> : null}
          {selectedTab === "documentacion" ? <MvzRanchDocumentsView {...contentProps} /> : null}
          {selectedTab === "visitas" ? <MvzRanchVisitsView {...contentProps} /> : null}
        </>
      ) : null}
    </div>
  );
}
