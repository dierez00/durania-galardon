"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
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
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { SanitarioBadge } from "@/modules/bovinos/presentation";
import {
  createMvzRanchDocument,
  deleteMvzRanchDocument,
  fetchMvzRanchDocuments,
  updateMvzRanchDocument,
} from "./mvzRanchApi";
import { formatDateTime } from "./formatters";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  PrimaryActionButton,
  SectionHeading,
  ViewModeToggle,
} from "./shared";
import { useSessionViewMode } from "./useSessionViewMode";
import type { MvzRanchDocumentRecord, MvzRanchTabProps } from "./types";

interface DocumentFormState {
  id?: string;
  documentType: string;
  fileStorageKey: string;
  fileHash: string;
  status: MvzRanchDocumentRecord["status"];
  issuedAt: string;
  expiryDate: string;
}

function getInitialForm(record?: MvzRanchDocumentRecord): DocumentFormState {
  return {
    id: record?.id,
    documentType: record?.document_type ?? "",
    fileStorageKey: record?.file_storage_key ?? "",
    fileHash: record?.file_hash ?? "",
    status: record?.status ?? "pending",
    issuedAt: record?.issued_at?.slice(0, 10) ?? "",
    expiryDate: record?.expiry_date?.slice(0, 10) ?? "",
  };
}

export function MvzRanchDocumentsView({
  uppId,
  refreshKey,
}: Readonly<MvzRanchTabProps>) {
  const [documents, setDocuments] = useState<MvzRanchDocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailRecord, setDetailRecord] = useState<MvzRanchDocumentRecord | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<MvzRanchDocumentRecord | null>(null);
  const [form, setForm] = useState<DocumentFormState>(getInitialForm());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const { viewMode, setViewMode } = useSessionViewMode(`mvz:ranch:${uppId}:documentacion:view`);

  const loadData = async () => {
    const data = await fetchMvzRanchDocuments(uppId);
    setDocuments(data.documents);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await fetchMvzRanchDocuments(uppId);
        if (!cancelled) {
          setDocuments(data.documents);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : "No fue posible cargar documentación.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, uppId]);

  const metrics = useMemo(
    () => ({
      current: documents.filter((document) => document.is_current).length,
      pending: documents.filter((document) => document.status === "pending").length,
      validated: documents.filter((document) => document.status === "validated").length,
    }),
    [documents]
  );

  const handleSubmit = async () => {
    setSaving(true);
    setFormError("");
    try {
      const payload = {
        documentType: form.documentType,
        fileStorageKey: form.fileStorageKey,
        fileHash: form.fileHash,
        status: form.status,
        issuedAt: form.issuedAt || undefined,
        expiryDate: form.expiryDate || undefined,
      };

      if (form.id) {
        await updateMvzRanchDocument(uppId, form.id, payload);
      } else {
        await createMvzRanchDocument(uppId, payload);
      }

      await loadData();
      setDialogOpen(false);
    } catch (nextError) {
      setFormError(nextError instanceof Error ? nextError.message : "No fue posible guardar el documento.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRecord) {
      return;
    }

    try {
      await deleteMvzRanchDocument(uppId, deleteRecord.id);
      await loadData();
      setDeleteRecord(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No fue posible eliminar el documento.");
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Documentación"
        description="Control documental del rancho con historial por tipo y vigencias clave."
        actions={
          <>
            <ViewModeToggle mode={viewMode} onChange={setViewMode} />
            <PrimaryActionButton
              label="Añadir documento"
              onClick={() => {
                setForm(getInitialForm());
                setFormError("");
                setDialogOpen(true);
              }}
            />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total" value={documents.length} />
        <MetricCard label="Versiones vigentes" value={metrics.current} />
        <MetricCard label="Pendientes" value={metrics.pending} />
        <MetricCard label="Validadas" value={metrics.validated} />
      </div>

      {error ? <ErrorState message={error} /> : null}
      {loading ? <LoadingState label="Cargando documentación..." /> : null}

      {!loading && !error && documents.length === 0 ? (
        <EmptyState
          title="Sin documentos"
          description="Agrega documentos del rancho para monitorear vigencias y estatus."
        />
      ) : null}

      {!loading && !error && documents.length > 0 && viewMode === "card" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {documents.map((document) => (
            <Card key={document.id}>
              <CardHeader className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{document.document_type}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Subido: {formatDateTime(document.uploaded_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setDetailRecord(document)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setForm(getInitialForm(document));
                        setFormError("");
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteRecord(document)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <SanitarioBadge estado={document.status} />
                  {document.is_current ? <SanitarioBadge estado="vigente" /> : null}
                </div>
                <p className="truncate text-muted-foreground">{document.file_storage_key}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Emitido</p>
                    <p>{document.issued_at || "Sin fecha"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Vence</p>
                    <p>{document.expiry_date || "Sin fecha"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {!loading && !error && documents.length > 0 && viewMode === "table" ? (
        <Card>
          <CardHeader>
            <CardTitle>Tabla documental</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Emitido</TableHead>
                  <TableHead>Vence</TableHead>
                  <TableHead>Archivo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell className="font-medium">{document.document_type}</TableCell>
                    <TableCell>
                      <SanitarioBadge estado={document.status} />
                    </TableCell>
                    <TableCell>{document.is_current ? "Sí" : "No"}</TableCell>
                    <TableCell>{document.issued_at || "—"}</TableCell>
                    <TableCell>{document.expiry_date || "—"}</TableCell>
                    <TableCell className="max-w-[240px] truncate text-xs text-muted-foreground">
                      {document.file_storage_key}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setDetailRecord(document)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setForm(getInitialForm(document));
                            setFormError("");
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteRecord(document)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar documento" : "Nuevo documento"}</DialogTitle>
            <DialogDescription>
              Actualiza metadatos y vigencias del archivo asociado al rancho.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="document-type">Tipo</Label>
              <Input
                id="document-type"
                value={form.documentType}
                onChange={(event) => setForm((prev) => ({ ...prev, documentType: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-status">Estado</Label>
              <select
                id="document-status"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                value={form.status}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    status: event.target.value as DocumentFormState["status"],
                  }))
                }
              >
                <option value="pending">Pendiente</option>
                <option value="validated">Validado</option>
                <option value="expired">Vencido</option>
                <option value="rejected">Rechazado</option>
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="document-storage">Storage key</Label>
              <Input
                id="document-storage"
                value={form.fileStorageKey}
                onChange={(event) => setForm((prev) => ({ ...prev, fileStorageKey: event.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="document-hash">Hash</Label>
              <Input
                id="document-hash"
                value={form.fileHash}
                onChange={(event) => setForm((prev) => ({ ...prev, fileHash: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-issued">Emitido</Label>
              <Input
                id="document-issued"
                type="date"
                value={form.issuedAt}
                onChange={(event) => setForm((prev) => ({ ...prev, issuedAt: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-expiry">Vence</Label>
              <Input
                id="document-expiry"
                type="date"
                value={form.expiryDate}
                onChange={(event) => setForm((prev) => ({ ...prev, expiryDate: event.target.value }))}
              />
            </div>
          </div>
          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.documentType.trim() || !form.fileStorageKey.trim() || !form.fileHash.trim() || saving}
            >
              {saving ? "Guardando..." : form.id ? "Guardar cambios" : "Crear documento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailRecord !== null} onOpenChange={(open) => !open && setDetailRecord(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detailRecord?.document_type}</DialogTitle>
            <DialogDescription>{detailRecord?.file_storage_key}</DialogDescription>
          </DialogHeader>
          {detailRecord ? (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <SanitarioBadge estado={detailRecord.status} />
                {detailRecord.is_current ? <SanitarioBadge estado="vigente" /> : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Emitido</p>
                  <p>{detailRecord.issued_at || "Sin fecha"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vence</p>
                  <p>{detailRecord.expiry_date || "Sin fecha"}</p>
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Hash</p>
                <p className="break-all">{detailRecord.file_hash}</p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteRecord !== null} onOpenChange={(open) => !open && setDeleteRecord(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar documento</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el archivo asociado y su registro documental.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
