"use client";

import { useState } from "react";
import type { BatchCreateSuccessItemDTO } from "@/modules/admin/productores/application/dto/CreateAdminProductorBatchDTO";
import type { AdminProductorBatchRowInput } from "@/modules/admin/productores/domain/repositories/adminProductoresRepository";
import { createProductoresBatchUseCase } from "@/modules/admin/productores/infra/container";

interface UseCreateAdminProductoresBatchOptions {
  onSuccess?: () => void | Promise<void>;
}

export function useCreateAdminProductoresBatch({
  onSuccess,
}: UseCreateAdminProductoresBatchOptions = {}) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [createdRows, setCreatedRows] = useState<BatchCreateSuccessItemDTO[]>([]);

  const handleCreateBatch = async (rows: AdminProductorBatchRowInput[]) => {
    setCreating(true);
    setError("");
    try {
      const result = await createProductoresBatchUseCase.execute({
        rows,
        options: { atomic: true },
      });
      setCreatedRows(result.created);
      await onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear productores en lote.");
    } finally {
      setCreating(false);
    }
  };

  return {
    creating,
    error,
    createdRows,
    clearCreatedRows: () => setCreatedRows([]),
    handleCreateBatch,
  };
}
