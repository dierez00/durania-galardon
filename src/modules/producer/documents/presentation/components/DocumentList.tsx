import { useMemo, useState } from "react";
import type { ProducerDocument } from "../../domain/entities/ProducerDocumentEntity";
import type { UppDocument } from "../../domain/entities/UppDocumentEntity";
import { UPP_DOCUMENT_TYPES } from "../../domain/entities/UppDocumentEntity";
import type { DocumentChangeEvent } from "../../domain/types/DocumentEvents";
import { documentDeletionPolicy } from "../../domain/services/documentDeletionPolicy";
import { resolveProducerDocumentComment } from "../../domain/services/documentCommentsPresentation";
import { useDocumentDelete } from "../hooks/useDocumentDelete";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Badge } from "@/shared/ui/badge";
import { Empty, EmptyTitle, EmptyDescription } from "@/shared/ui/empty";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { getAccessToken } from "@/shared/lib/auth-session";
import { cn } from "@/shared/lib/utils";

interface Props {
  producerDocuments: ProducerDocument[];
  uppDocuments: UppDocument[];
  loading?: boolean;
  recentChanges?: DocumentChangeEvent[];
  isUpdating?: boolean;
  lastUpdate?: Date | null;
  onDeleteSuccess: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  validated: "Validado",
  expired: "Vencido",
  rejected: "Rechazado",
};

// Mapa de key → nombre amigable para documentos de UPP
const UPP_DOC_TYPE_NAME: Record<string, string> = Object.fromEntries(
  UPP_DOCUMENT_TYPES.map((t) => [t.key, t.name])
);

function statusVariant(
  status: string
): "success" | "warning" | "error" | "neutral" {
  if (status === "validated") return "success";
  if (status === "expired" || status === "rejected") return "error";
  if (status === "pending") return "warning";
  return "neutral";
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "ahora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

interface ChangeWithDocumentId {
  documentId: string;
}

interface DisplayDocumentBase {
  id: string;
  status: ProducerDocument["status"];
  comments: string | null;
  isCurrent: boolean;
  expiryDate: string | null;
  uploadedAt: string;
  level: "Personal" | "Rancho";
  categoryKey: string;
  documentTypeName: string;
  documentTypeKey: string;
  source: ProducerDocument | UppDocument;
}

type DisplayDocument = DisplayDocumentBase;

function hasDocumentId(data: unknown): data is ChangeWithDocumentId {
  if (typeof data !== "object" || data === null) return false;
  const candidate = data as Record<string, unknown>;
  return typeof candidate.documentId === "string";
}

export function DocumentList({
  producerDocuments,
  uppDocuments,
  loading,
  recentChanges,
  isUpdating,
  lastUpdate,
  onDeleteSuccess,
}: Props) {
  // Memoizar Set de IDs recientemente cambiados para busca O(1)
  const recentChangeIds = useMemo(() => {
    if (!recentChanges?.length) return new Set<string>();
    return new Set<string>(
      recentChanges
        .map((c) => (hasDocumentId(c.data) ? c.data.documentId : null))
        .filter((id): id is string => Boolean(id))
    );
  }, [recentChanges]);

  const allDocs = useMemo<DisplayDocument[]>(() => {
    const personal: DisplayDocument[] = producerDocuments.map((d) => ({
      id: d.id,
      status: d.status,
      comments: d.comments,
      isCurrent: d.isCurrent,
      expiryDate: d.expiryDate,
      uploadedAt: d.uploadedAt,
      level: "Personal",
      categoryKey: `personal:${d.documentTypeId}`,
      documentTypeName: d.documentTypeName || d.documentTypeKey,
      documentTypeKey: d.documentTypeKey,
      source: d,
    }));

    const ranch: DisplayDocument[] = uppDocuments.map((d) => ({
      id: d.id,
      status: d.status,
      comments: d.comments,
      isCurrent: d.isCurrent,
      expiryDate: d.expiryDate,
      uploadedAt: d.uploadedAt,
      level: "Rancho",
      categoryKey: `upp:${d.uppId}:${d.documentType}`,
      documentTypeName: UPP_DOC_TYPE_NAME[d.documentType] ?? d.documentType,
      documentTypeKey: d.documentType,
      source: d,
    }));

    return [...personal, ...ranch].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }, [producerDocuments, uppDocuments]);

  const [showAll, setShowAll] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [pendingDeleteDoc, setPendingDeleteDoc] = useState<DisplayDocument | null>(null);
  const { deletingId, deleteDocument } = useDocumentDelete();
  const categoryVersionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const doc of allDocs) {
      counts.set(doc.categoryKey, (counts.get(doc.categoryKey) ?? 0) + 1);
    }
    return counts;
  }, [allDocs]);
  const visibleDocs = useMemo(
    () => (showAll ? allDocs : allDocs.filter((d) => d.isCurrent)),
    [allDocs, showAll]
  );

  const handleOpen = async (doc: DisplayDocument) => {
    setOpeningId(doc.id);
    try {
      const token = await getAccessToken();
      const endpoint = doc.level === "Personal"
        ? `/api/producer/documents/${doc.id}/file`
        : `/api/producer/upp-documents/${doc.id}/file`;

      const res = await fetch(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const body = await res.json();
      if (!res.ok || !body.ok) {
        throw new Error(body.error?.message ?? "No se pudo obtener el archivo");
      }
      const url = body.data?.url;
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setOpeningId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteDoc) return;
    const hasOtherVersion = (categoryVersionCounts.get(pendingDeleteDoc.categoryKey) ?? 0) > 1;
    try {
      await deleteDocument(pendingDeleteDoc.source, pendingDeleteDoc.level, hasOtherVersion);
      onDeleteSuccess();
      setPendingDeleteDoc(null);
    } catch {
      // Error handled in hook with toast
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documentos Cargados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </CardContent>
      </Card>
    );
  }

  if (allDocs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Documentos Cargados</CardTitle>
        </CardHeader>
        <CardContent>
          <Empty>
            <FileText className="h-12 w-12 text-muted-foreground" />
            <EmptyTitle>No hay documentos</EmptyTitle>
            <EmptyDescription>Comienza cargando tu primer documento</EmptyDescription>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle>Documentos Cargados ({visibleDocs.length})</CardTitle>
          {lastUpdate && (
            <p className="text-xs text-muted-foreground">
              Actualizado {getTimeAgo(lastUpdate)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll((prev) => !prev)}
          >
            {showAll ? "Mostrar solo vigentes" : "Mostrar todos"}
          </Button>
          {isUpdating && (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-info" />
              <span className="text-xs text-muted-foreground">Actualizando...</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Version</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Vigencia</TableHead>
              <TableHead>Fecha de Carga</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleDocs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No hay documentos vigentes. Usa "Mostrar todos" para ver el historial.
                </TableCell>
              </TableRow>
            ) : (
              visibleDocs.map((doc) => {
                const hasRecentChange = recentChangeIds.has(doc.id);
                const hasOtherVersion = (categoryVersionCounts.get(doc.categoryKey) ?? 0) > 1;
                const canDelete = documentDeletionPolicy.canDelete({
                  isCurrent: doc.isCurrent,
                  status: doc.status,
                  hasOtherVersion,
                });
                const producerMessage = resolveProducerDocumentComment({
                  status: doc.status,
                  isCurrent: doc.isCurrent,
                  comments: doc.comments,
                  documentTypeKey: doc.documentTypeKey,
                });
                const isOpening = openingId === doc.id;
                const isDeleting = deletingId === doc.id;

                return (
                  <TableRow
                    key={doc.id}
                    className={cn(
                      "transition-colors",
                      hasRecentChange && "bg-info-bg border-l-4 border-l-info"
                    )}
                  >
                    <TableCell className="font-medium">
                      {doc.documentTypeName || doc.documentTypeKey}
                    </TableCell>
                    <TableCell>
                      <Badge variant={doc.isCurrent ? "default" : "secondary"}>
                        {doc.isCurrent ? "Vigente" : "Historico"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant={statusVariant(doc.status)}>
                          {STATUS_LABELS[doc.status] ?? doc.status}
                        </Badge>
                        {producerMessage ? (
                          <p className="max-w-[320px] text-xs text-muted-foreground">
                            {producerMessage}
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      {doc.expiryDate ? (
                        <span className={doc.status === "expired" ? "text-destructive" : ""}>
                          {new Date(doc.expiryDate).toLocaleDateString("es-MX")}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(doc.uploadedAt).toLocaleDateString("es-MX")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleOpen(doc)}
                          disabled={isOpening || isDeleting}
                        >
                          {isOpening ? "Abriendo..." : "Ver"}
                        </Button>
                        {canDelete && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setPendingDeleteDoc(doc)}
                            disabled={isDeleting || isOpening}
                          >
                            {isDeleting ? "Eliminando..." : "Eliminar"}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>

      <AlertDialog
        open={pendingDeleteDoc !== null}
        onOpenChange={(open) => {
          if (!open && !deletingId) {
            setPendingDeleteDoc(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar eliminacion</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion eliminara el documento{" "}
              <strong className="text-foreground">
                {pendingDeleteDoc?.documentTypeName ?? ""}
              </strong>
              . Deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingId)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteConfirm()}
              disabled={Boolean(deletingId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deletingId ? "Eliminando..." : "Eliminar documento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
