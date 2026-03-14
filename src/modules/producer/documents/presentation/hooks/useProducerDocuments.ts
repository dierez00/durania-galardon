import { useCallback } from "react";
import type { ProducerDocument } from "../../domain/entities/ProducerDocumentEntity";
import { listProducerDocumentsUseCase } from "../../infra/container";
import { useDocumentPolling } from "./useDocumentPolling";
import type { DocumentChangeEvent } from "../../domain/types/DocumentEvents";

export interface UseProducerDocumentsResult {
  documents: ProducerDocument[];
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
  changes: DocumentChangeEvent[];
  lastUpdate: Date | null;
}

export function useProducerDocuments(): UseProducerDocumentsResult {
  // Función que ejecuta el use case
  const loadFn = useCallback(
    () => listProducerDocumentsUseCase.execute(),
    []
  );

  // Usar el hook de polling
  const polling = useDocumentPolling<ProducerDocument>(
    loadFn,
    'personal',
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
