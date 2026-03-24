"use client";

import { useState } from "react";
import type {
  AdminMvzBatchCreateSuccessItem,
  AdminMvzBatchRowInput,
  AdminMvzRoleKey,
} from "@/modules/admin/mvz/domain/repositories/adminMvzRepository";
import { createAdminMvzBatchUseCase } from "@/modules/admin/mvz/infra/container";

interface UseCreateAdminMvzBatchOptions {
  onSuccess?: () => void | Promise<void>;
}

export function useCreateAdminMvzBatch({ onSuccess }: UseCreateAdminMvzBatchOptions = {}) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [createdRows, setCreatedRows] = useState<AdminMvzBatchCreateSuccessItem[]>([]);

  const handleCreateBatch = async (rows: AdminMvzBatchRowInput[], roleKey: AdminMvzRoleKey) => {
    setCreating(true);
    setError("");
    try {
      const result = await createAdminMvzBatchUseCase.execute({
        rows,
        options: {
          atomic: true,
          roleKey,
        },
      });
      setCreatedRows(result.created);
      await onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear MVZ en lote.");
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
