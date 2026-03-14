'use client';

import { useEffect, useRef, useReducer, useCallback } from 'react';
import { ProducerDocument } from '@/modules/producer/documents/domain/entities/ProducerDocumentEntity';
import { UppDocument } from '@/modules/producer/documents/domain/entities/UppDocumentEntity';
import { DocumentChangeEvent } from '@/modules/producer/documents/domain/types/DocumentEvents';
import { DocumentChangeDetector } from '@/modules/producer/documents/domain/services/documentChangeDetector';

interface UseDocumentPollingOptions {
  interval?: number | null; // ms entre polls; null desactiva intervalo
  enabled?: boolean; // Permitir poll, default true
  onWindowFocus?: boolean; // Refrescar al volver al foco/visibilidad
}

export interface PollingResult<T extends ProducerDocument | UppDocument> {
  documents: T[];
  previousDocuments: T[];
  changes: DocumentChangeEvent[];
  isPolling: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refetch: () => Promise<void>;
}

interface PollingState<T extends ProducerDocument | UppDocument> {
  documents: T[];
  previousDocuments: T[];
  changes: DocumentChangeEvent[];
  isPolling: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

type PollingAction<T extends ProducerDocument | UppDocument> =
  | { type: 'START_POLLING' }
  | { type: 'UPDATE_SUCCESS'; payload: { documents: T[]; changes: DocumentChangeEvent[] } }
  | { type: 'UPDATE_ERROR'; payload: string }
  | { type: 'STOP_POLLING' };

function pollingReducer<T extends ProducerDocument | UppDocument>(
  state: PollingState<T>,
  action: PollingAction<T>
): PollingState<T> {
  switch (action.type) {
    case 'START_POLLING':
      return { ...state, isPolling: true };
    case 'UPDATE_SUCCESS':
      return {
        ...state,
        previousDocuments: state.documents,
        documents: action.payload.documents,
        changes: action.payload.changes,
        error: null,
        isPolling: false,
        lastUpdate: new Date(),
      };
    case 'UPDATE_ERROR':
      return { ...state, error: action.payload, isPolling: false };
    case 'STOP_POLLING':
      return { ...state, isPolling: false };
    default:
      return state;
  }
}

export function useDocumentPolling<T extends ProducerDocument | UppDocument>(
  loadFn: () => Promise<T[]>,
  level: 'personal' | 'upp',
  options: UseDocumentPollingOptions = {}
): PollingResult<T> {
  const { interval = 5000, enabled = true } = options;
  const { onWindowFocus = false } = options;

  const [state, dispatch] = useReducer(pollingReducer<T>, {
    documents: [],
    previousDocuments: [],
    changes: [],
    isPolling: false,
    error: null,
    lastUpdate: null,
  });

  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const detectorRef = useRef(new DocumentChangeDetector());
  const lastFetchRef = useRef<number>(0);
  const currentDocsRef = useRef<T[]>([]);
  // En la primera carga no generamos eventos de cambio; solo establecemos el baseline
  const isFirstLoadRef = useRef(true);

  // La función poll NO depende de documents/previousDocuments (usa refs), solo de level y loadFn
  const poll = useCallback(async () => {
    const now = Date.now();

    // Debounce: mínimo 2 segundos entre fetches
    if (now - lastFetchRef.current < 2000) {
      return;
    }

    // No hacer polling si la pestaña está oculta (optimización)
    if (typeof document !== 'undefined' && document.hidden) {
      return;
    }

    lastFetchRef.current = now;
    dispatch({ type: 'START_POLLING' });

    try {
      const newDocuments = await loadFn();

      // En la primera carga solo fijamos el baseline; no generamos alertas de "recién subido"
      let detectedChanges: DocumentChangeEvent[] = [];
      if (!isFirstLoadRef.current) {
        detectedChanges = detectorRef.current.detectChanges(
          currentDocsRef.current,
          newDocuments,
          level
        );
      } else {
        isFirstLoadRef.current = false;
      }

      currentDocsRef.current = newDocuments;

      dispatch({
        type: 'UPDATE_SUCCESS',
        payload: { documents: newDocuments, changes: detectedChanges },
      });
    } catch (err) {
      dispatch({
        type: 'UPDATE_ERROR',
        payload: err instanceof Error ? err.message : 'Error al actualizar documentos',
      });
    }
  }, [level, loadFn]);

  // Configurar polling automático
  useEffect(() => {
    if (!enabled) return;

    // Primera carga inmediata
    void poll();

    // Polling periódico (solo si interval no es null)
    if (interval !== null) {
      pollingTimeoutRef.current = setInterval(() => {
        void poll();
      }, interval);
    }

    // Refrescar al recuperar visibilidad o foco si se solicita
    if (onWindowFocus && typeof window !== 'undefined') {
      const handler = () => void poll();
      window.addEventListener('focus', handler);
      document.addEventListener('visibilitychange', handler);
      return () => {
        if (pollingTimeoutRef.current) clearInterval(pollingTimeoutRef.current);
        window.removeEventListener('focus', handler);
        document.removeEventListener('visibilitychange', handler);
      };
    }

    // Limpiar al desmontar
    return () => {
      if (pollingTimeoutRef.current) {
        clearInterval(pollingTimeoutRef.current);
      }
      if (onWindowFocus && typeof window !== 'undefined') {
        // event listeners removidos arriba en el return cuando onWindowFocus es true
      }
    };
  }, [poll, interval, enabled, onWindowFocus]);

  return {
    documents: state.documents,
    previousDocuments: state.previousDocuments,
    changes: state.changes,
    isPolling: state.isPolling,
    error: state.error,
    lastUpdate: state.lastUpdate,
    refetch: poll,
  };
}
