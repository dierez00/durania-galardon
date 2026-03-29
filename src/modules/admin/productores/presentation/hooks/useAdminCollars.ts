import { useCallback, useEffect, useState } from "react";
import { listAdminCollars } from "@/modules/collars/application/services";
import type {
  CollarListItem,
  CollarSortState,
  CollarsFiltersState,
} from "@/modules/collars/presentation/types";

interface AdminCollarsState {
  collars: CollarListItem[];
  total: number;
  totalPages: number;
  page: number;
  canPrev: boolean;
  canNext: boolean;
  loading: boolean;
  error: string;
  limit: number;
  sort: CollarSortState;
}

const DEFAULT_FILTERS: CollarsFiltersState = {
  search: "",
  status: "",
  productor_id: "",
  firmware: "",
  dateFrom: "",
  dateTo: "",
};

export function useAdminCollars() {
  const [state, setState] = useState<AdminCollarsState>({
    collars: [],
    total: 0,
    totalPages: 0,
    page: 1,
    canPrev: false,
    canNext: false,
    loading: true,
    error: "",
    limit: 50,
    sort: { field: "linked_at", dir: "desc" },
  });

  const [filters, setFilters] = useState<CollarsFiltersState>(DEFAULT_FILTERS);
  const [reloadTick, setReloadTick] = useState(0);

  const fetchCollars = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: "" }));

    try {
      const skip = (state.page - 1) * state.limit;
      const response = await listAdminCollars(filters, state.limit, skip, state.sort);

      const totalPages = Math.ceil(response.total / state.limit);

      setState((prev) => ({
        ...prev,
        collars: response.collars,
        total: response.total,
        totalPages,
        canPrev: state.page > 1,
        canNext: state.page < totalPages,
        loading: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "No fue posible cargar collares",
      }));
    }
  }, [state.page, state.limit, state.sort, filters, reloadTick]);

  useEffect(() => {
    fetchCollars();
  }, [fetchCollars]);

  const setPage = useCallback((page: number) => {
    setState((prev) => ({ ...prev, page }));
  }, []);

  const handleSortChange = useCallback((newSort: CollarSortState) => {
    setState((prev) => ({ ...prev, sort: newSort, page: 1 }));
  }, []);

  const handleFiltersChange = useCallback((newFilters: CollarsFiltersState) => {
    setFilters(newFilters);
    setState((prev) => ({ ...prev, page: 1 }));
  }, []);

  const reload = useCallback(() => {
    setReloadTick((prev) => prev + 1);
  }, []);

  return {
    ...state,
    filters,
    setPage,
    handleSortChange,
    handleFiltersChange,
    reload,
  };
}
