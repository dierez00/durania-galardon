"use client";

import { useEffect, useMemo, useState } from "react";
import { DocumentProgressIndicator } from "./components/DocumentProgressIndicator";
import { DocumentUploadCard } from "./components/DocumentUploadCard";
import { DocumentList } from "./components/DocumentList";
import { DocumentStatusNotification } from "./components/DocumentStatusNotification";
import { useProducerDocuments } from "./hooks/useProducerDocuments";
import { useUppDocuments } from "./hooks/useUppDocuments";
import { useDocumentProgress } from "./hooks/useDocumentProgress";
import { useProducerUppContext, useProducerUpps } from "@/modules/producer/ranchos/presentation";
import { Skeleton } from "@/shared/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui/tabs";
import type { DocumentChangeEvent } from "@/modules/producer/documents/domain/types/DocumentEvents";

const MAX_ALERT_QUEUE_SIZE = 50;
const RECENT_UPLOAD_TIMESTAMP_KEY = "durania:document_upload_timestamp";
const UPLOAD_DUPLICATE_THRESHOLD_MS = 3000; // 3 segundos

/**
 * Filtra eventos duplicados de "newly-uploaded" que ocurrieron dentro de 3 segundos
 * después del último upload exitoso registrado en sessionStorage.
 * Esto evita mostrar dos alertas: una del toast en POST + otra del polling.
 */
function filterDuplicateUploadEvents(events: DocumentChangeEvent[]): DocumentChangeEvent[] {
  const lastUploadTime = typeof window !== "undefined" ? sessionStorage.getItem(RECENT_UPLOAD_TIMESTAMP_KEY) : null;
  
  if (!lastUploadTime) {
    return events; // Sin timestamp registrado, retornar eventos sin filtrar
  }

  const lastUploadMs = parseInt(lastUploadTime, 10);
  if (isNaN(lastUploadMs)) {
    return events;
  }

  return events.filter((event) => {
    // Si es un evento "newly-uploaded" dentro de 3 seg del upload, filtrarlo
    if (event.type === "newly-uploaded") {
      const eventTime = new Date(event.data.uploadedAt).getTime();
      const timeDiff = Date.now() - lastUploadMs;
      
      // Si el evento ocurrió dentro del threshold de tiempo después del upload, descartarlo
      if (timeDiff < UPLOAD_DUPLICATE_THRESHOLD_MS) {
        return false;
      }
    }
    
    return true;
  });
}

export interface ProducerDocumentosPageProps {
  scope?: "all" | "personal" | "upp" | "mixed";
  title?: string;
  description?: string;
}

export default function ProducerDocumentosPage({
  scope = "all",
  title,
  description,
}: ProducerDocumentosPageProps) {
  const { selectedUppId, selectedUpp } = useProducerUppContext();
  const {
    documents: producerDocs,
    loading: loadingProducer,
    reload: reloadProducer,
    changes: producerChanges,
    lastUpdate: producerLastUpdate,
  } = useProducerDocuments();
  const {
    documents: uppDocs,
    loading: loadingUpp,
    reload: reloadUpp,
    changes: uppChanges,
    lastUpdate: uppLastUpdate,
  } = useUppDocuments(scope === "upp" || scope === "mixed" ? selectedUppId : null);
  const { upps, loading: loadingUpps } = useProducerUpps();

  const [alertQueue, setAlertQueue] = useState<DocumentChangeEvent[]>([]);
  const [currentAlert, setCurrentAlert] = useState<DocumentChangeEvent | null>(null);

  const producerDocuments = scope === "upp" ? [] : producerDocs;
  const uppDocuments = scope === "personal" ? [] : uppDocs;
  const isMixedScope = scope === "mixed";

  const progress = useDocumentProgress(
    producerDocuments,
    uppDocuments,
    upps.map((upp) => ({ id: upp.id, name: upp.name })),
    scope === "mixed" || scope === "upp" ? (selectedUppId ?? undefined) : undefined
  );

  const allChanges = useMemo(
    () => {
      const combined = [
        ...(scope === "upp" ? [] : producerChanges || []),
        ...(scope === "personal" ? [] : uppChanges || []),
      ];
      // Filtrar eventos duplicados de "newly-uploaded" cercanos al timestamp de upload
      return filterDuplicateUploadEvents(combined);
    },
    [producerChanges, scope, uppChanges]
  );

  const headingTitle =
    title ??
    (scope === "personal"
      ? "Documentos del productor"
      : scope === "upp"
        ? "Documentos del proyecto"
        : scope === "mixed" && selectedUpp
          ? `Documentos: ${selectedUpp.name}`
          : "Documentos");

  const headingDescription =
    description ??
    (scope === "personal"
      ? "Carga y seguimiento documental de la organizacion productora."
      : scope === "upp" && selectedUpp
        ? `Carga y seguimiento documental de ${selectedUpp.name}.`
        : scope === "mixed" && selectedUpp
          ? `Documentos personales y del proyecto ${selectedUpp.name}.`
          : "Carga y seguimiento documental del productor y sus ranchos.");

  const handleUploadSuccess = () => {
    if (scope !== "upp" && scope !== "mixed") {
      reloadProducer();
    }
    if (scope !== "personal") {
      reloadUpp();
    }
    if (scope === "mixed") {
      reloadProducer();
      reloadUpp();
    }
  };

  const handleDeleteSuccess = () => {
    if (scope !== "upp" && scope !== "mixed") {
      reloadProducer();
    }
    if (scope !== "personal") {
      reloadUpp();
    }
    if (scope === "mixed") {
      reloadProducer();
      reloadUpp();
    }
  };

  useEffect(() => {
    if (allChanges.length > 0) {
      setAlertQueue((previous) => [...previous, ...allChanges].slice(-MAX_ALERT_QUEUE_SIZE));
    }
  }, [allChanges]);

  useEffect(() => {
    if (!currentAlert && alertQueue.length > 0) {
      const [firstAlert, ...rest] = alertQueue;
      setCurrentAlert(firstAlert);
      setAlertQueue(rest);
    }
  }, [alertQueue, currentAlert]);

  const loading =
    (scope === "upp" ? false : loadingProducer) ||
    (scope === "personal" ? false : loadingUpp) ||
    loadingUpps;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{headingTitle}</h1>
        <p className="text-sm text-muted-foreground">{headingDescription}</p>
      </div>

      {loading && !progress ? (
        <Skeleton className="h-48 w-full" />
      ) : progress ? (
        <DocumentProgressIndicator progress={progress} />
      ) : null}

      <DocumentUploadCard
        upps={upps.map((upp) => ({ id: upp.id, name: upp.name }))}
        mode={scope}
        defaultUppId={scope === "upp" || scope === "mixed" ? selectedUppId : null}
        onSuccess={handleUploadSuccess}
      />

      {isMixedScope ? (
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal">Documentos Personales</TabsTrigger>
            <TabsTrigger value="proyecto">Documentos del Proyecto</TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="space-y-4">
            <DocumentList
              producerDocuments={producerDocuments}
              uppDocuments={[]}
              loading={loading}
              recentChanges={producerChanges || []}
              isUpdating={loadingProducer}
              lastUpdate={producerLastUpdate}
              onDeleteSuccess={handleDeleteSuccess}
            />
          </TabsContent>

          <TabsContent value="proyecto" className="space-y-4">
            <DocumentList
              producerDocuments={[]}
              uppDocuments={uppDocuments}
              loading={loading}
              recentChanges={uppChanges || []}
              isUpdating={loadingUpp}
              lastUpdate={uppLastUpdate}
              onDeleteSuccess={handleDeleteSuccess}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <DocumentList
          producerDocuments={producerDocuments}
          uppDocuments={uppDocuments}
          loading={loading}
          recentChanges={allChanges}
          isUpdating={
            (scope === "upp" ? false : loadingProducer) ||
            (scope === "personal" ? false : loadingUpp)
          }
          lastUpdate={producerLastUpdate || uppLastUpdate}
          onDeleteSuccess={handleDeleteSuccess}
        />
      )}

      {currentAlert ? (
        <DocumentStatusNotification
          event={currentAlert}
          open={Boolean(currentAlert)}
          onOpenChange={(open) => {
            if (!open) {
              setCurrentAlert(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}
