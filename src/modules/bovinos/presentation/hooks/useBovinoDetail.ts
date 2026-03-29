"use client";

import { useCallback, useEffect, useState } from "react";
import { getBovinoDetailUseCase } from "@/modules/bovinos/infra/container";
import type { Bovino } from "@/modules/bovinos/domain/entities/Bovino";
import type { BovinoFieldTest } from "@/modules/bovinos/domain/entities/BovinoFieldTest";
import type { BovinoSanitaryIncident } from "@/modules/bovinos/domain/entities/BovinoSanitaryIncident";
import type { BovinoVaccination } from "@/modules/bovinos/domain/entities/BovinoVaccination";
import type { BovinoExport } from "@/modules/bovinos/domain/entities/BovinoExport";

export type BovinoDetailTab =
  | "pruebas"
  | "incidentes"
  | "genealogia"
  | "vacunaciones"
  | "ubicacion"
  | "historial_actividad"
  | "exportaciones";

interface BovinoDetailState {
  bovino: Bovino | null;
  loading: boolean;
  error: string;
  activeTab: BovinoDetailTab;
  fieldTests: BovinoFieldTest[];
  incidents: BovinoSanitaryIncident[];
  vaccinations: BovinoVaccination[];
  exports: BovinoExport[];
  offspring: Bovino[];
}

export function useBovinoDetail(id: string) {
  const [state, setState] = useState<BovinoDetailState>({
    bovino: null,
    loading: true,
    error: "",
    activeTab: "pruebas",
    fieldTests: [],
    incidents: [],
    vaccinations: [],
    exports: [],
    offspring: [],
  });

  const loadDetail = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const result = await getBovinoDetailUseCase.execute(id);
      if (!result) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Bovino no encontrado.",
        }));
        return;
      }
      setState((prev) => ({
        ...prev,
        loading: false,
        bovino: result.bovino,
        fieldTests: result.fieldTests,
        incidents: result.incidents,
        vaccinations: result.vaccinations,
        exports: result.exports,
        offspring: result.offspring,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Error al cargar detalle.",
      }));
    }
  }, [id]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const setActiveTab = useCallback((tab: BovinoDetailTab) => {
    setState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  return { ...state, setActiveTab, reload: loadDetail };
}
