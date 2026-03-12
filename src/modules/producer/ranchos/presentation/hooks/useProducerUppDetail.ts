"use client";

import { useCallback, useEffect, useState } from "react";
import { getProducerUppDetailUseCase } from "@/modules/producer/ranchos/infra/container";
import type { ProducerUpp } from "@/modules/producer/ranchos/domain/entities/ProducerUppEntity";

export function useProducerUppDetail(id: string) {
  const [upp, setUpp] = useState<ProducerUpp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getProducerUppDetailUseCase.execute(id);
      if (data) {
        setUpp(data);
      } else {
        setError("No se encontró el rancho.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar el rancho.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  return { upp, loading, error, reload: loadDetail };
}
