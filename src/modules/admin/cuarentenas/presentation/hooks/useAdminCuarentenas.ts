"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  listCuarentenasUseCase,
  getMapPointsUseCase,
} from "@/modules/admin/cuarentenas/infra/container";
import type {
  AdminCuarentena,
  AdminCuarentenasFiltersState,
  AdminCuarentenasSortState,
} from "@/modules/admin/cuarentenas/domain/entities/AdminCuarentenaEntity";
import type { AdminCuarentenaMapPoint } from "@/modules/admin/cuarentenas/domain/entities/AdminCuarentenaDetailEntity";

export const DEFAULT_FILTERS: AdminCuarentenasFiltersState = {
  search: "",
  status: "",
  quarantineType: "",
  dateFrom: "",
  dateTo: "",
};

export const DEFAULT_SORT: AdminCuarentenasSortState = {
  field: "started_at",
  dir: "desc",
};

export const PAGE_LIMIT = 20;

export function useAdminCuarentenas() {
  // ── Lista ──────────────────────────────────────────────────────────────────
  const [cuarentenas, setCuarentenas] = useState<AdminCuarentena[]>([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");

  // ── Filtros (inmediatos en UI, debounced para el fetch) ────────────────────
  const [filters, setFilters]           = useState<AdminCuarentenasFiltersState>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<AdminCuarentenasFiltersState>(DEFAULT_FILTERS);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFiltersChange = useCallback(
    (next: AdminCuarentenasFiltersState) => {
      setFilters(next);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const isTextOnly =
        next.status         === filters.status &&
        next.quarantineType === filters.quarantineType &&
        next.dateFrom       === filters.dateFrom &&
        next.dateTo         === filters.dateTo;
      const delay = isTextOnly ? 400 : 0;
      debounceRef.current = setTimeout(() => {
        setAppliedFilters(next);
        setPage(1);
      }, delay);
    },
    [filters.status, filters.quarantineType, filters.dateFrom, filters.dateTo]
  );

  const clearFilters = useCallback(() => handleFiltersChange(DEFAULT_FILTERS), [handleFiltersChange]);

  // ── Ordenamiento ───────────────────────────────────────────────────────────
  const [sort, setSort] = useState<AdminCuarentenasSortState>(DEFAULT_SORT);

  const handleSortChange = useCallback((next: AdminCuarentenasSortState) => {
    setSort(next);
    setPage(1);
  }, []);

  // ── Fetch lista ────────────────────────────────────────────────────────────
  const loadCuarentenas = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listCuarentenasUseCase.execute({
        search:         appliedFilters.search,
        status:         appliedFilters.status,
        quarantineType: appliedFilters.quarantineType,
        dateFrom:       appliedFilters.dateFrom,
        dateTo:         appliedFilters.dateTo,
        page,
        limit:   PAGE_LIMIT,
        sortBy:  sort.field,
        sortDir: sort.dir,
      });
      setCuarentenas(result.quarantines);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar cuarentenas.");
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, page, sort]);

  useEffect(() => { void loadCuarentenas(); }, [loadCuarentenas]);

  // ── Mapa ───────────────────────────────────────────────────────────────────
  const [mapPoints, setMapPoints]   = useState<AdminCuarentenaMapPoint[]>([]);
  const [mapLoading, setMapLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setMapLoading(true);
      try {
        const points = await getMapPointsUseCase.execute();
        setMapPoints(points);
      } catch {
        // mapa no crítico — fallo silencioso
      } finally {
        setMapLoading(false);
      }
    })();
  }, []);

  // ── Derivados ──────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const hasActiveFilters = Object.values(appliedFilters).some(Boolean);

  /** Puntos del mapa filtrados según los mismos filtros activos en la tabla */
  const filteredMapPoints = useMemo(() => {
    return mapPoints.filter((p) => {
      if (appliedFilters.status && p.status !== appliedFilters.status) return false;
      if (appliedFilters.quarantineType && p.quarantineType !== appliedFilters.quarantineType) return false;
      if (appliedFilters.search) {
        const q = appliedFilters.search.toLowerCase();
        const match = [p.title, p.uppName, p.producerName].some(
          (s) => s?.toLowerCase().includes(q),
        );
        if (!match) return false;
      }
      return true;
    });
  }, [mapPoints, appliedFilters]);

  return {
    cuarentenas,
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
    hasActiveFilters,
    handleFiltersChange,
    handleSortChange,
    clearFilters,
    reload: loadCuarentenas,
    mapPoints: filteredMapPoints,
    mapLoading,
  };
}
