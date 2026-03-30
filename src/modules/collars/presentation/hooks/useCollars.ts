"use client";

import { useState, useCallback, useEffect } from "react";
import { listAdminCollars } from "@/modules/collars/application/services";
import type {
  CollarListItem,
  CollarsFiltersState,
  CollarSortState,
} from "../types";

export const COLLARS_PAGE_LIMIT = 20;
export const DEFAULT_SORT: CollarSortState = { field: "linked_at", dir: "desc" };
export const DEFAULT_FILTERS: CollarsFiltersState = {
  search: "",
  status: "",
  firmware: "",
  productor_id: "",
  dateFrom: "",
  dateTo: "",
};

interface UseCollarsReturn {
  collars: CollarListItem[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  filters: CollarsFiltersState;
  sort: CollarSortState;
  handleFiltersChange: (newFilters: CollarsFiltersState) => void;
  handleSortChange: (sort: CollarSortState) => void;
  setPage: (page: number) => void;
  reload: () => Promise<void>;
}

export function useCollars(
  producerId?: string
): UseCollarsReturn {
  const [collars, setCollars] = useState<CollarListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CollarsFiltersState>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<CollarSortState>(DEFAULT_SORT);

  // Fetch de collares
  const fetchCollars = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Convert page (1-indexed) to skip (0-indexed offset)
      const skip = (page - 1) * COLLARS_PAGE_LIMIT;

      const response = await listAdminCollars(
        filters,
        COLLARS_PAGE_LIMIT,
        skip,
        sort,
        producerId
      );
      setCollars(response.collars || []);
      setTotal(response.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar collares");
    } finally {
      setLoading(false);
    }
  }, [page, filters, sort, producerId]);

  // Debounce para filtros (400ms para search, inmediato para otros)
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchCollars();
    }, filters.search ? 400 : 0);

    return () => clearTimeout(timer);
  }, [filters, sort, fetchCollars]);

  return {
    collars,
    total,
    page,
    pageSize: COLLARS_PAGE_LIMIT,
    loading,
    error,
    filters,
    sort,
    handleFiltersChange: (newFilters) => {
      setFilters(newFilters);
      setPage(1);
    },
    handleSortChange: (newSort) => {
      setSort(newSort);
      setPage(1);
    },
    setPage,
    reload: fetchCollars,
  };
}
