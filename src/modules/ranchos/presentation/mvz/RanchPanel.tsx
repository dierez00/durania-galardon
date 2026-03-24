"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { SanitarioBadge } from "@/modules/bovinos/presentation";
import { useMvzRanchContext, useMvzRealtime } from "@/modules/ranchos/presentation/mvz";
import { MVZ_RANCH_TABS } from "./constants";
import { fetchMvzRanchOverview } from "./mvzRanchApi";
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
            <p className="text-sm font-medium text-muted-foreground">Seguimiento del rancho</p>
            <h1 className="text-3xl font-semibold">{overview?.upp_name ?? "Cargando rancho..."}</h1>
            <p className="text-sm text-muted-foreground">
              {overview?.producer_name
                ? `${overview.producer_name}${overview.upp_code ? ` · ${overview.upp_code}` : ""}`
                : "Consulta el estado sanitario, la documentación y las actividades más recientes de este rancho."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {overview?.upp_status ? <SanitarioBadge estado={overview.upp_status} /> : null}
            {overview?.sanitary_alert ? <SanitarioBadge estado={overview.sanitary_alert} /> : null}
          </div>
        </div>
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
