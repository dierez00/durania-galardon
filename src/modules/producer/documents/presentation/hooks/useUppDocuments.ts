import { useCallback } from "react";
import type { UppDocument } from "../../domain/entities/UppDocumentEntity";
import { listUppDocumentsUseCase } from "../../infra/container";
import { useDocumentPolling } from "./useDocumentPolling";
import type { DocumentChangeEvent } from "../../domain/types/DocumentEvents";

export interface UseUppDocumentsResult {
  documents: UppDocument[];
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
  changes: DocumentChangeEvent[];
  lastUpdate: Date | null;
}

export function useUppDocuments(): UseUppDocumentsResult {
  // Función que ejecuta el use case
  const loadFn = useCallback(
    () => listUppDocumentsUseCase.execute(),
    []
  );

  // Usar el hook de polling
  const polling = useDocumentPolling<UppDocument>(
    loadFn,
    'upp',
    { interval: null, enabled: true, onWindowFocus: true }
  );

  // Crear función reload manual
  const reload = useCallback(async () => {
    await polling.refetch();
  }, [polling.refetch]);

  return {
    documents: polling.documents,
    loading: polling.isPolling,
    error: polling.error || "",
    reload,
    changes: polling.changes,
    lastUpdate: polling.lastUpdate,
  };
}
