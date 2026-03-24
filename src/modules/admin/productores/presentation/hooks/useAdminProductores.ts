"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listProductoresUseCase } from "@/modules/admin/productores/infra/container";
import type {
  AdminProductor,
  AdminProductoresFiltersState,
  AdminProductoresSortState,
} from "@/modules/admin/productores/domain/entities/AdminProductorEntity";

export const DEFAULT_FILTERS: AdminProductoresFiltersState = {
  search: "",
  status: "",
  dateFrom: "",
  dateTo: "",
};

export const DEFAULT_SORT: AdminProductoresSortState = {
  field: "registered_at",
  dir: "desc",
};

export const PAGE_LIMIT = 20;

export function useAdminProductores() {
  // ── Lista ──────────────────────────────────────────────────────────────────
  const [producers, setProducers] = useState<AdminProductor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Filtros (inmediatos en UI, debounced para el fetch) ────────────────────
  const [filters, setFilters] = useState<AdminProductoresFiltersState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<AdminProductoresFiltersState>(DEFAULT_FILTERS);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFiltersChange = useCallback(
    (next: AdminProductoresFiltersState) => {
      setFilters(next);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      // Búsqueda de texto → 400 ms; cambios de select/fecha → inmediato
      const isTextOnly =
        next.status === filters.status &&
        next.dateFrom === filters.dateFrom &&
        next.dateTo === filters.dateTo;
      const delay = isTextOnly ? 400 : 0;
      debounceRef.current = setTimeout(() => {
        setAppliedFilters(next);
        setPage(1);
      }, delay);
    },
    [filters.status, filters.dateFrom, filters.dateTo]
  );

  // ── Ordenamiento ───────────────────────────────────────────────────────────
  const [sort, setSort] = useState<AdminProductoresSortState>(DEFAULT_SORT);

  const handleSortChange = useCallback((next: AdminProductoresSortState) => {
    setSort(next);
    setPage(1);
  }, []);

  // ── Fetch via caso de uso ──────────────────────────────────────────────────
  const loadProducers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listProductoresUseCase.execute({
        search: appliedFilters.search,
        status: appliedFilters.status,
        dateFrom: appliedFilters.dateFrom,
        dateTo: appliedFilters.dateTo,
        page,
        limit: PAGE_LIMIT,
        sortBy: sort.field,
        sortDir: sort.dir,
      });
      setProducers(result.producers);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar productores.");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page, sort]);

  useEffect(() => {
    void loadProducers();
  }, [loadProducers]);

  // ── Paginación derivada ────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  return {
    producers,
    total,
    totalPages,
    page,
    canPrev: page > 1,
    canNext: page < totalPages,
    setPage,
    loading,
    error,
    filters,
    sort,
    handleFiltersChange,
    handleSortChange,
    reload: loadProducers,
  };
}
