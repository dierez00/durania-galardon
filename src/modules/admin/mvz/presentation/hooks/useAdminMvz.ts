"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listAdminMvzUseCase } from "@/modules/admin/mvz/infra/container";
import type {
  AdminMvz,
  AdminMvzFiltersState,
  AdminMvzSortState,
} from "@/modules/admin/mvz/domain/entities/AdminMvzEntity";

export const DEFAULT_FILTERS: AdminMvzFiltersState = {
  search: "",
  status: "",
  dateFrom: "",
  dateTo: "",
};

export const DEFAULT_SORT: AdminMvzSortState = {
  field: "registered_at",
  dir: "desc",
};

export const PAGE_LIMIT = 20;

export function useAdminMvz() {
  // ── Lista ──────────────────────────────────────────────────────────────────
  const [mvzProfiles, setMvzProfiles] = useState<AdminMvz[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Filtros (inmediatos en UI, debounced para el fetch) ────────────────────
  const [filters, setFilters] = useState<AdminMvzFiltersState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<AdminMvzFiltersState>(DEFAULT_FILTERS);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFiltersChange = useCallback(
    (next: AdminMvzFiltersState) => {
      setFilters(next);
      if (debounceRef.current) clearTimeout(debounceRef.current);
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
  const [sort, setSort] = useState<AdminMvzSortState>(DEFAULT_SORT);

  const handleSortChange = useCallback((next: AdminMvzSortState) => {
    setSort(next);
    setPage(1);
  }, []);

  // ── Fetch via caso de uso ──────────────────────────────────────────────────
  const loadMvz = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listAdminMvzUseCase.execute({
        search: appliedFilters.search,
        status: appliedFilters.status,
        dateFrom: appliedFilters.dateFrom,
        dateTo: appliedFilters.dateTo,
        page,
        limit: PAGE_LIMIT,
        sortBy: sort.field,
        sortDir: sort.dir,
      });
      setMvzProfiles(result.mvzProfiles);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar MVZ.");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page, sort]);

  useEffect(() => {
    void loadMvz();
  }, [loadMvz]);

  // ── Paginación derivada ────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  return {
    mvzProfiles,
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
    reload: loadMvz,
  };
}
