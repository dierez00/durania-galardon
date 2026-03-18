"use client";

import { useEffect, useState, useMemo } from "react";
import { DocumentProgressIndicator } from "@/modules/producer/documents/presentation/components/DocumentProgressIndicator";
import { DocumentUploadCard } from "@/modules/producer/documents/presentation/components/DocumentUploadCard";
import { DocumentList } from "@/modules/producer/documents/presentation/components/DocumentList";
import { DocumentStatusNotification } from "@/modules/producer/documents/presentation/components/DocumentStatusNotification";
import { useProducerDocuments } from "@/modules/producer/documents/presentation/hooks/useProducerDocuments";
import { useUppDocuments } from "@/modules/producer/documents/presentation/hooks/useUppDocuments";
import { useDocumentProgress } from "@/modules/producer/documents/presentation/hooks/useDocumentProgress";
import { useProducerUpps } from "@/modules/producer/ranchos/presentation/hooks/useProducerUpps";
import { Skeleton } from "@/shared/ui/skeleton";
import type { DocumentChangeEvent } from "@/modules/producer/documents/domain/types/DocumentEvents";

// Límite máximo de alertas en cola para evitar memory leaks
const MAX_ALERT_QUEUE_SIZE = 50;

export default function ProducerDocumentosPage() {
  const { documents: producerDocs, loading: loadingProducer, reload: reloadProducer, changes: producerChanges, lastUpdate: producerLastUpdate } =
    useProducerDocuments();
  const { documents: uppDocs, loading: loadingUpp, reload: reloadUpp, changes: uppChanges, lastUpdate: uppLastUpdate } = useUppDocuments();
  const { upps, loading: loadingUpps } = useProducerUpps();

  const [alertQueue, setAlertQueue] = useState<DocumentChangeEvent[]>([]);
  const [currentAlert, setCurrentAlert] = useState<DocumentChangeEvent | null>(null);

  const progress = useDocumentProgress(
    producerDocs,
    uppDocs,
    upps.map((u) => ({ id: u.id, name: u.name }))
  );

  // Memoizar combinación de cambios una sola vez
  const allChanges = useMemo(
    () => [...(producerChanges || []), ...(uppChanges || [])],
    [producerChanges, uppChanges]
  );

  const handleUploadSuccess = () => {
    reloadProducer();
    reloadUpp();
  };

  const handleDeleteSuccess = () => {
    reloadProducer();
    reloadUpp();
  };

  // Agregar cambios a la cola de alertas (con límite)
  useEffect(() => {
    if (allChanges.length > 0) {
      setAlertQueue(prev => {
        const updated = [...prev, ...allChanges];
        // Mantener solo los últimos MAX_ALERT_QUEUE_SIZE items
        return updated.slice(-MAX_ALERT_QUEUE_SIZE);
      });
    }
  }, [allChanges]);

  // Mostrar alertas una por una de la cola
  useEffect(() => {
    if (!currentAlert && alertQueue.length > 0) {
      const [firstAlert, ...rest] = alertQueue;
      setCurrentAlert(firstAlert);
      setAlertQueue(rest);
    }
  }, [currentAlert, alertQueue]);

  const loading = loadingProducer || loadingUpp || loadingUpps;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documentos</h1>
        <p className="text-sm text-muted-foreground">
          Carga y seguimiento documental del productor y sus ranchos.
        </p>
      </div>

      {loading && !progress ? (
        <Skeleton className="h-48 w-full" />
      ) : progress ? (
        <DocumentProgressIndicator progress={progress} />
      ) : null}

      <DocumentUploadCard
        upps={upps.map((u) => ({ id: u.id, name: u.name }))}
        onSuccess={handleUploadSuccess}
      />

      <DocumentList
        producerDocuments={producerDocs}
        uppDocuments={uppDocs}
        loading={loading}
        recentChanges={allChanges}
        isUpdating={loadingProducer || loadingUpp}
        lastUpdate={producerLastUpdate || uppLastUpdate}
        onDeleteSuccess={handleDeleteSuccess}
      />

      {/* Alert Dialog para cambios importantes */}
      {currentAlert && (
        <DocumentStatusNotification
          event={currentAlert}
          open={!!currentAlert}
          onOpenChange={(open) => {
            if (!open) {
              setCurrentAlert(null);
            }
          }}
        />
      )}
    </div>
  );
}
