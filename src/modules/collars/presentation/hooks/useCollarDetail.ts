"use client";

import { useState, useCallback, useEffect } from "react";
import {
  getAdminCollarDetail,
  getCollarHistory,
  updateAdminCollarStatus,
} from "@/modules/collars/application/services";
import type { AdminEditableCollarStatus } from "@/modules/collars/application/dto";
import type { CollarDetail, CollarLinkHistory, AnimalInfo, ProducerInfo } from "../types";

interface UseCollarDetailReturn {
  detail: CollarDetail | null;
  loading: boolean;
  error: string | null;
  linkedAnimal: AnimalInfo | null;
  linkedProducer: ProducerInfo | null;
  history: CollarLinkHistory[];
  historyTotal: number;
  historyPage: number;
  loadingHistory: boolean;
  setHistoryPage: (page: number) => void;
  isSavingStatus: boolean;
  handleStatusChange: (status: AdminEditableCollarStatus, notes?: string) => Promise<void>;
}

export function useCollarDetail(collarId: string): UseCollarDetailReturn {
  const [detail, setDetail] = useState<CollarDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [linkedAnimal, setLinkedAnimal] = useState<AnimalInfo | null>(null);
  const [linkedProducer, setLinkedProducer] = useState<ProducerInfo | null>(null);

  const [history, setHistory] = useState<CollarLinkHistory[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [isSavingStatus, setIsSavingStatus] = useState(false);

  // Fetch detalle del collar
  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getAdminCollarDetail(collarId);
      setDetail(result.collar);
      setLinkedAnimal(result.animal || null);
      setLinkedProducer(result.producer || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar collar");
    } finally {
      setLoading(false);
    }
  }, [collarId]);

  // Fetch historial
  const fetchHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);

      const result = await getCollarHistory(collarId);
      setHistory(result.history || []);
      setHistoryTotal(result.total || 0);
    } catch (err) {
      console.error("Error fetching history", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [collarId, historyPage]);

  // Update status
  const handleUpdateStatus = useCallback(
    async (status: AdminEditableCollarStatus, notes?: string) => {
      try {
        setIsSavingStatus(true);

        await updateAdminCollarStatus(collarId, status, notes);

        await fetchDetail();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error actualizing status");
      } finally {
        setIsSavingStatus(false);
      }
    },
    [collarId, fetchDetail]
  );

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    detail,
    loading,
    error,
    linkedAnimal,
    linkedProducer,
    history,
    historyTotal,
    historyPage,
    loadingHistory,
    setHistoryPage,
    isSavingStatus,
    handleStatusChange: handleUpdateStatus,
  };
}
