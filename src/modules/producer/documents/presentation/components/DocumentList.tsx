import { useMemo, useState } from "react";
import type { ProducerDocument } from "../../domain/entities/ProducerDocumentEntity";
import type { UppDocument } from "../../domain/entities/UppDocumentEntity";
import { UPP_DOCUMENT_TYPES } from "../../domain/entities/UppDocumentEntity";
import type { DocumentChangeEvent } from "../../domain/types/DocumentEvents";
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
import { getAccessToken } from "@/shared/lib/auth-session";

interface Props {
  producerDocuments: ProducerDocument[];
  uppDocuments: UppDocument[];
  loading?: boolean;
  recentChanges?: DocumentChangeEvent[];
  isUpdating?: boolean;
  lastUpdate?: Date | null;
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
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "validated") return "default";
  if (status === "expired" || status === "rejected") return "destructive";
  return "secondary";
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

export function DocumentList({
  producerDocuments,
  uppDocuments,
  loading,
  recentChanges,
  isUpdating,
  lastUpdate,
}: Props) {
  // Memoizar Set de IDs recientemente cambiados para busca O(1)
  const recentChangeIds = useMemo(() => {
    if (!recentChanges?.length) return new Set<string>();
    return new Set(
      recentChanges.map(c => {
        const data = c.data as any;
        return data?.documentId;
      }).filter(Boolean) as string[]
    );
  }, [recentChanges]);

  // Mostrar solo documentos vigentes (isCurrent) para evitar duplicados
  const currentProducerDocs = useMemo(
    () => producerDocuments.filter((d) => d.isCurrent),
    [producerDocuments]
  );

  const currentUppDocs = useMemo(
    () => uppDocuments.filter((d) => d.isCurrent),
    [uppDocuments]
  );

  const allDocs = useMemo(
    () =>
      [
        ...currentProducerDocs.map((d) => ({ ...d, level: "Personal" as const })),
        ...currentUppDocs.map((d) => ({
          ...d,
          level: "Rancho" as const,
          documentTypeName: UPP_DOC_TYPE_NAME[d.documentType] ?? d.documentType,
          documentTypeKey: d.documentType,
          ocrConfidence: null,
        })),
      ].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()),
    [currentProducerDocs, currentUppDocs]
  );

  const [openingId, setOpeningId] = useState<string | null>(null);

  const handleOpen = async (doc: { id: string; level: "Personal" | "Rancho" }) => {
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
          <CardTitle>Documentos Cargados ({allDocs.length})</CardTitle>
          {lastUpdate && (
            <p className="text-xs text-muted-foreground">
              Actualizado {getTimeAgo(lastUpdate)}
            </p>
          )}
        </div>
        {isUpdating && (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            <span className="text-xs text-muted-foreground">Actualizando...</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Nivel</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Vigencia</TableHead>
              <TableHead>Fecha de Carga</TableHead>
              <TableHead>Archivo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allDocs.map((doc) => {
              const hasRecentChange = recentChangeIds.has(doc.id);
              return (
                <TableRow
                  key={doc.id}
                  className={`transition-colors ${
                    hasRecentChange
                      ? 'bg-blue-50 border-l-4 border-l-blue-500'
                      : ''
                  }`}
                >
                  <TableCell className="font-medium">
                    {doc.documentTypeName || doc.documentTypeKey}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{doc.level}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(doc.status)}>
                      {STATUS_LABELS[doc.status] ?? doc.status}
                    </Badge>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleOpen(doc)}
                      disabled={openingId === doc.id}
                    >
                      {openingId === doc.id ? "Abriendo..." : "Ver"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
