"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listBovinosUseCase } from "@/modules/bovinos/infra/container";
import type { Bovino, BovinosFiltersState } from "@/modules/bovinos/domain/entities/Bovino";

export const DEFAULT_BOVINOS_FILTERS: BovinosFiltersState = {
  search: "",
  sexo: "",
  sanitario: "",
  exportable: "",
  fechaDesde: "",
  fechaHasta: "",
};

export function useBovinos(uppId?: string | null) {
  const [bovinos, setBovinos] = useState<Bovino[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState<BovinosFiltersState>(DEFAULT_BOVINOS_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<BovinosFiltersState>(
    DEFAULT_BOVINOS_FILTERS
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFiltersChange = useCallback(
    (next: BovinosFiltersState) => {
      setFilters(next);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const isTextOnly =
        next.sexo === filters.sexo &&
        next.sanitario === filters.sanitario &&
        next.exportable === filters.exportable &&
        next.fechaDesde === filters.fechaDesde &&
        next.fechaHasta === filters.fechaHasta;
      const delay = isTextOnly ? 400 : 0;
      debounceRef.current = setTimeout(() => {
        setAppliedFilters(next);
      }, delay);
    },
    [filters.sexo, filters.sanitario, filters.exportable, filters.fechaDesde, filters.fechaHasta]
  );

  const loadBovinos = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listBovinosUseCase.execute({
        search: appliedFilters.search,
        sexo: appliedFilters.sexo,
        sanitario: appliedFilters.sanitario,
        exportable: appliedFilters.exportable,
        fechaDesde: appliedFilters.fechaDesde,
        fechaHasta: appliedFilters.fechaHasta,
      }, uppId);
      setBovinos(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar bovinos.");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, uppId]);

  useEffect(() => {
    void loadBovinos();
  }, [loadBovinos]);

  return {
    bovinos,
    loading,
    error,
    filters,
    onFiltersChange: handleFiltersChange,
    reload: loadBovinos,
  };
}
