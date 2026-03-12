"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listProducerUppsUseCase } from "@/modules/producer/ranchos/infra/container";
import type {
  ProducerUpp,
  ProducerUppsFiltersState,
} from "@/modules/producer/ranchos/domain/entities/ProducerUppEntity";

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
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const isTextOnly = next.status === filters.status;
      const delay = isTextOnly ? 400 : 0;
      debounceRef.current = setTimeout(() => {
        setAppliedFilters(next);
      }, delay);
    },
    [filters.status]
  );

  const loadUpps = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listProducerUppsUseCase.execute({
        search: appliedFilters.search,
        status: appliedFilters.status,
      });
      setUpps(result.upps);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar ranchos.");
    } finally {
      setLoading(false);
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
