"use client";

import { useCallback, useEffect, useState } from "react";
import type { Bovino } from "@/modules/bovinos/domain/entities/Bovino";
import type { BovinoExport } from "@/modules/bovinos/domain/entities/BovinoExport";
import type { BovinoFieldTest } from "@/modules/bovinos/domain/entities/BovinoFieldTest";
import type { BovinoSanitaryIncident } from "@/modules/bovinos/domain/entities/BovinoSanitaryIncident";
import type { BovinoVaccination } from "@/modules/bovinos/domain/entities/BovinoVaccination";
import { toDomainBovino } from "@/modules/bovinos/infra/mappers/bovino.mapper";
import { getAccessToken } from "@/shared/lib/auth-session";
import type { BovinoDetailTab } from "./useBovinoDetail";

interface MvzBovinoDetailState {
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

interface MvzBovinoDetailPayload {
  ok?: boolean;
  data?: {
    bovino?: unknown;
    fieldTests?: BovinoFieldTest[];
    incidents?: BovinoSanitaryIncident[];
    vaccinations?: BovinoVaccination[];
    exports?: BovinoExport[];
    offspring?: unknown[];
  };
  error?: {
    message?: string;
  };
}

export function useMvzBovinoDetail(uppId: string, animalId: string) {
  const [state, setState] = useState<MvzBovinoDetailState>({
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
      const token = await getAccessToken();
      if (!token) {
        throw new Error("No existe sesion activa.");
      }

      const response = await fetch(`/api/mvz/ranchos/${uppId}/animales/${animalId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const body = (await response.json()) as MvzBovinoDetailPayload;

      if (!response.ok || !body.ok || !body.data?.bovino) {
        throw new Error(body.error?.message ?? "No fue posible cargar el bovino.");
      }

      const payload = body.data;

      setState((prev) => ({
        ...prev,
        loading: false,
        bovino: toDomainBovino(payload.bovino as Parameters<typeof toDomainBovino>[0]),
        fieldTests: payload.fieldTests ?? [],
        incidents: payload.incidents ?? [],
        vaccinations: payload.vaccinations ?? [],
        exports: payload.exports ?? [],
        offspring: (payload.offspring ?? []).map((item) =>
          toDomainBovino(item as Parameters<typeof toDomainBovino>[0])
        ),
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : "Error al cargar detalle.",
      }));
    }
  }, [animalId, uppId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const setActiveTab = useCallback((tab: BovinoDetailTab) => {
    setState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  return { ...state, setActiveTab, reload: loadDetail };
}
