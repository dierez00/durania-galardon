"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getExportacionDetailUseCase,
  getExportacionAnimalesUseCase,
  updateExportacionStatusUseCase,
} from "@/modules/exportaciones/admin/infra/container";
import type { AdminExportacionDetallada } from "@/modules/exportaciones/admin/domain/entities/AdminExportacionDetailEntity";
import type { AdminExportacionAnimal } from "@/modules/exportaciones/admin/domain/entities/AdminExportacionAnimalEntity";
import type { UpdateAdminExportacionStatusDTO } from "@/modules/exportaciones/admin/application/dto/UpdateAdminExportacionStatusDTO";

export type ExportacionDetailTab = "info" | "animales" | "proceso";

export function useAdminExportacionDetail(id: string) {
  const [detail, setDetail] = useState<AdminExportacionDetallada | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [errorDetail, setErrorDetail] = useState("");

  const [animals, setAnimals] = useState<AdminExportacionAnimal[]>([]);
  const [loadingAnimals, setLoadingAnimals] = useState(false);

  const [activeTab, setActiveTab] = useState<ExportacionDetailTab>("info");

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    setLoadingDetail(true);
    setErrorDetail("");
    try {
      const data = await getExportacionDetailUseCase.execute(id);
      if (data) {
        setDetail(data);
      } else {
        setErrorDetail("No se encontrÃ³ la solicitud de exportaciÃ³n.");
      }
    } catch {
      setErrorDetail("Error al cargar los datos de la exportaciÃ³n.");
    } finally {
      setLoadingDetail(false);
    }
  }, [id]);

  const loadAnimals = useCallback(async () => {
    if (animals.length > 0) return;
    setLoadingAnimals(true);
    try {
      const data = await getExportacionAnimalesUseCase.execute(id);
      setAnimals(data);
    } catch {
      // silently fail â€” UI shows empty state
    } finally {
      setLoadingAnimals(false);
    }
  }, [id, animals.length]);

  const handleTabChange = useCallback(
    (tab: ExportacionDetailTab) => {
      setActiveTab(tab);
      if (tab === "animales") void loadAnimals();
    },
    [loadAnimals]
  );

  const updateStatus = useCallback(
    async (dto: UpdateAdminExportacionStatusDTO) => {
      if (!detail) return;
      setIsUpdatingStatus(true);
      setUpdateError(null);
      try {
        await updateExportacionStatusUseCase.execute(id, dto);
        await loadDetail();
      } catch (err) {
        setUpdateError(err instanceof Error ? err.message : "Error al actualizar el estado.");
      } finally {
        setIsUpdatingStatus(false);
      }
    },
    [detail, id, loadDetail]
  );

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  return {
    detail,
    loadingDetail,
    errorDetail,
    animals,
    loadingAnimals,
    activeTab,
    handleTabChange,
    isUpdatingStatus,
    updateError,
    updateStatus,
    reload: loadDetail,
  };
}

