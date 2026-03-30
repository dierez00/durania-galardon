"use client";

import { useState, useCallback, useEffect } from "react";
import { listAdminCollars } from "@/modules/collars/application/services";
import type { ProducerCollarItem } from "@/modules/collars/presentation/types";

interface UseProducerCollarsReturn {
  collars: ProducerCollarItem[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  setPage: (page: number) => void;
}

export function useProducerCollars(producerId: string): UseProducerCollarsReturn {
  const [collars, setCollars] = useState<ProducerCollarItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageSize = 20;

  const fetchCollars = useCallback(async () => {
    if (!producerId) return;

    try {
      setLoading(true);
      setError(null);

      const skip = (page - 1) * pageSize;
      const result = await listAdminCollars(
        {
          search: "",
          status: "",
          productor_id: producerId,
          firmware: "",
          dateFrom: "",
          dateTo: "",
        },
        pageSize,
        skip,
        { field: "linked_at", dir: "desc" },
        producerId
      );

      setCollars((result.collars as unknown as ProducerCollarItem[]) || []);
      setTotal(result.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching collars");
    } finally {
      setLoading(false);
    }
  }, [producerId, page, pageSize]);

  useEffect(() => {
    fetchCollars();
  }, [fetchCollars]);

  return {
    collars,
    total,
    page,
    pageSize,
    loading,
    error,
    setPage,
  };
}
