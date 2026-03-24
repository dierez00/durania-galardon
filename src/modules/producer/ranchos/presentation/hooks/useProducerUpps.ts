"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listProducerUppsUseCase } from "@/modules/producer/ranchos/infra/container";
import type {
  ProducerUpp,
  ProducerUppsFiltersState,
} from "@/modules/producer/ranchos/domain/entities/ProducerUppEntity";
import {
  logProducerAccessClient,
  sampleProducerAccessClientIds,
} from "@/modules/producer/ranchos/presentation/producerAccessDebug";

export const DEFAULT_FILTERS: ProducerUppsFiltersState = {
  search: "",
  status: "",
};

export function useProducerUpps() {
  const [upps, setUpps] = useState<ProducerUpp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState<ProducerUppsFiltersState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<ProducerUppsFiltersState>(DEFAULT_FILTERS);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFiltersChange = useCallback(
    (next: ProducerUppsFiltersState) => {
      setFilters(next);
      logProducerAccessClient("useProducerUpps:filters-change", {
        currentFilters: filters,
        nextFilters: next,
      });
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const isTextOnly = next.status === filters.status;
      const delay = isTextOnly ? 400 : 0;
      debounceRef.current = setTimeout(() => {
        setAppliedFilters(next);
        logProducerAccessClient("useProducerUpps:filters-applied", {
          appliedFilters: next,
          delayMs: delay,
        });
      }, delay);
    },
    [filters.status]
  );

  const loadUpps = useCallback(async () => {
    setLoading(true);
    setError("");
    logProducerAccessClient("useProducerUpps:load-start", {
      appliedFilters,
    });
    try {
      const result = await listProducerUppsUseCase.execute({
        search: appliedFilters.search,
        status: appliedFilters.status,
      });
      setUpps(result.upps);
      logProducerAccessClient("useProducerUpps:load-success", {
        appliedFilters,
        upps: sampleProducerAccessClientIds(result.upps.map((upp) => upp.id)),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar ranchos.";
      setError(message);
      logProducerAccessClient("useProducerUpps:load-error", {
        appliedFilters,
        message,
      });
    } finally {
      setLoading(false);
      logProducerAccessClient("useProducerUpps:load-end", {
        appliedFilters,
      });
    }
  }, [appliedFilters]);

  useEffect(() => {
    void loadUpps();
  }, [loadUpps]);

  return {
    upps,
    loading,
    error,
    filters,
    onFiltersChange: handleFiltersChange,
    reload: loadUpps,
  };
}
