"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listExportacionesUseCase } from "@/modules/exportaciones/admin/infra/container";
import { deleteAdminExportacion } from "@/modules/exportaciones/admin/infra/api/adminExportacionesApi";
import type {
  AdminExportacion,
  AdminExportacionesFiltersState,
  AdminExportacionesSortField,
} from "@/modules/exportaciones/admin/domain/entities/AdminExportacionEntity";

export const DEFAULT_FILTERS: AdminExportacionesFiltersState = {
  search: "",
  status: "",
  dateFrom: "",
  dateTo: "",
};

export type SortDir = "asc" | "desc";

export interface AdminExportacionesSortState {
  field: AdminExportacionesSortField;
  dir: SortDir;
}

export const DEFAULT_SORT: AdminExportacionesSortState = {
  field: "created_at",
  dir: "desc",
};

export const PAGE_LIMIT = 20;

export function useAdminExportaciones() {
  const [exportaciones, setExportaciones] = useState<AdminExportacion[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState<AdminExportacionesFiltersState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<AdminExportacionesFiltersState>(DEFAULT_FILTERS);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFiltersChange = useCallback(
    (next: AdminExportacionesFiltersState) => {
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

  const [sort, setSort] = useState<AdminExportacionesSortState>(DEFAULT_SORT);
  const handleSortChange = useCallback((next: AdminExportacionesSortState) => {
    setSort(next);
    setPage(1);
  }, []);

  const loadExportaciones = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listExportacionesUseCase.execute({
        search: appliedFilters.search,
        status: appliedFilters.status,
        dateFrom: appliedFilters.dateFrom,
        dateTo: appliedFilters.dateTo,
        page,
        limit: PAGE_LIMIT,
        sortBy: sort.field,
        sortDir: sort.dir,
      });
      setExportaciones(result.exportaciones);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar exportaciones.");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page, sort]);

  useEffect(() => {
    void loadExportaciones();
  }, [loadExportaciones]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  const removeExportacion = useCallback(async (exportId: string) => {
    await deleteAdminExportacion(exportId);
  }, []);

  return {
    exportaciones,
    total,
    totalPages,
    page,
    setPage,
    loading,
    error,
    filters,
    handleFiltersChange,
    sort,
    handleSortChange,
    reload: loadExportaciones,
    deleteExportacion: removeExportacion,
  };
}

