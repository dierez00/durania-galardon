"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminMvz, AdminMvzFiltersState } from "@/modules/admin/mvz/domain/entities/AdminMvzEntity";
import { filterAdminMvz } from "@/modules/admin/mvz/application/use-cases/filterAdminMvz";
import { listAdminMvzUseCase } from "@/modules/admin/mvz/infra/container";

const DEFAULT_FILTERS: AdminMvzFiltersState = {
  search: "",
  status: "",
};

export function useAdminMvz() {
  const [items, setItems] = useState<AdminMvz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<AdminMvzFiltersState>(DEFAULT_FILTERS);

  const loadMvz = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listAdminMvzUseCase.execute();
      setItems(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible cargar MVZ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMvz();
  }, [loadMvz]);

  const filteredItems = useMemo(() => filterAdminMvz(items, filters), [items, filters]);

  return {
    items: filteredItems,
    total: filteredItems.length,
    loading,
    error,
    filters,
    setFilters,
    reload: loadMvz,
  };
}
