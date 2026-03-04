"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCuarentenaDetailUseCase,
  updateCuarentenaStatusUseCase,
  updateCuarentenaInfoUseCase,
} from "@/modules/admin/cuarentenas/infra/container";
import type { AdminCuarentenaDetallada } from "@/modules/admin/cuarentenas/domain/entities/AdminCuarentenaDetailEntity";

export type DetailTab = "resumen" | "upp" | "mapa" | "historial";

export function useAdminCuarentenaDetail(id: string) {
  const [quarantine, setQuarantine] = useState<AdminCuarentenaDetallada | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [activeTab, setActiveTab]   = useState<DetailTab>("resumen");

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

  // ── Cambio de estado ──────────────────────────────────────────────────────
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

  // ── Actualizar info ───────────────────────────────────────────────────────
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
        setInfoError(err instanceof Error ? err.message : "Error al guardar información.");
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
