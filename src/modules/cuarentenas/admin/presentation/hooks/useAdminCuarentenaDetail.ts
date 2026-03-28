"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCuarentenaDetailUseCase,
  updateCuarentenaStatusUseCase,
  updateCuarentenaInfoUseCase,
} from "@/modules/cuarentenas/admin/infra/container";
import type { AdminCuarentenaDetallada } from "@/modules/cuarentenas/admin/domain/entities/AdminCuarentenaDetailEntity";

export type DetailTab = "resumen" | "upp" | "mapa" | "historial";

interface UseAdminCuarentenaDetailOptions {
  initialTab?: DetailTab;
}

export function useAdminCuarentenaDetail(id: string, options: UseAdminCuarentenaDetailOptions = {}) {
  const [quarantine, setQuarantine] = useState<AdminCuarentenaDetallada | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [activeTab, setActiveTab]   = useState<DetailTab>(options.initialTab ?? "resumen");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const detail = await getCuarentenaDetailUseCase.execute(id);
      if (detail) {
        setQuarantine(detail);
      } else {
        setError("Cuarentena no encontrada.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar cuarentena.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    setActiveTab(options.initialTab ?? "resumen");
  }, [options.initialTab]);

  // â”€â”€ Cambio de estado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError]   = useState("");

  const handleStatusChange = useCallback(
    async (status: "active" | "released" | "suspended") => {
      setStatusSaving(true);
      setStatusError("");
      try {
        await updateCuarentenaStatusUseCase.execute(id, status);
        await load();
      } catch (err) {
        setStatusError(err instanceof Error ? err.message : "Error al cambiar estado.");
      } finally {
        setStatusSaving(false);
      }
    },
    [id, load]
  );

  // â”€â”€ Actualizar info â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [infoSaving, setInfoSaving] = useState(false);
  const [infoError, setInfoError]   = useState("");

  const handleInfoUpdate = useCallback(
    async (payload: { epidemiologicalNote?: string; geojson?: Record<string, unknown> | null }) => {
      setInfoSaving(true);
      setInfoError("");
      try {
        await updateCuarentenaInfoUseCase.execute(id, payload);
        await load();
      } catch (err) {
        setInfoError(err instanceof Error ? err.message : "Error al guardar informaciÃ³n.");
      } finally {
        setInfoSaving(false);
      }
    },
    [id, load]
  );

  return {
    quarantine,
    loading,
    error,
    activeTab,
    setActiveTab,
    reload: load,
    statusSaving,
    statusError,
    handleStatusChange,
    infoSaving,
    infoError,
    handleInfoUpdate,
  };
}

