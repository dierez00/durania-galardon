"use client";

import { useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/shared/ui";
import type {
  AdminProductorDocument,
  AdminProductorDocumentDetail,
  AdminDocumentStatus,
} from "@/modules/admin/productores/domain/entities/AdminProductorDetailEntity";
import { toneToBadgeVariant } from "@/shared/ui/theme";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDocument: AdminProductorDocument | null;
  detail: AdminProductorDocumentDetail | null;
  fileUrl: string | null;
  loading: boolean;
  loadingFile: boolean;
  error: string | null;
  status: AdminDocumentStatus;
  comments: string;
  expiryDate: string;
  dirty: boolean;
  isSaving: boolean;
  onStatusChange: (status: AdminDocumentStatus) => void;
  onCommentsChange: (comments: string) => void;
  onExpiryDateChange: (expiryDate: string) => void;
  onSave: () => Promise<void>;
  onSaveAndNext: () => Promise<void>;
}

function statusLabel(status: AdminDocumentStatus): string {
  if (status === "validated") return "Validado";
  if (status === "expired") return "Vencido";
  if (status === "rejected") return "Rechazado";
  return "Pendiente";
}

function statusTone(status: AdminDocumentStatus): "success" | "warning" | "error" | "neutral" {
  if (status === "validated") return "success";
  if (status === "expired") return "warning";
  if (status === "rejected") return "error";
  return "neutral";
}

function formatDate(dateValue: string | null): string {
  if (!dateValue) return "-";
  return new Date(dateValue).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function AdminProductorDocumentReviewDialog({
  open,
  onOpenChange,
  selectedDocument,
  detail,
  fileUrl,
  loading,
  loadingFile,
  error,
  status,
  comments,
  expiryDate,
  dirty,
  isSaving,
  onStatusChange,
  onCommentsChange,
  onExpiryDateChange,
  onSave,
  onSaveAndNext,
}: Readonly<Props>) {
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && dirty && !isSaving) {
      setShowDiscardDialog(true);
      return;
    }
    onOpenChange(nextOpen);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-6xl w-[96vw] p-0 gap-0" showCloseButton={!isSaving}>
          <DialogHeader className="px-6 pt-6 pb-2 border-b border-border/60">
            <DialogTitle>Revisión de documento</DialogTitle>
            <DialogDescription>
              Verifica archivo, OCR y confirma estado del documento.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[68vh]">
            <div className="border-r border-border/60 p-4">
              <div className="rounded-lg border border-border/70 h-full bg-muted/20">
                {loading || loadingFile ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    Cargando archivo...
                  </div>
                ) : fileUrl ? (
                  <div className="h-full p-3 flex flex-col gap-3">
                    <div className="flex justify-end">
                      <Button asChild size="sm" variant="outline">
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                          Ver completo
                        </a>
                      </Button>
                    </div>
                    <iframe title="Documento" src={fileUrl} className="w-full h-[62vh] rounded-lg" />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    No fue posible generar vista previa del archivo.
                  </div>
                )}
              </div>
            </div>

            <ScrollArea className="h-[68vh]">
              <div className="p-5 space-y-5">
                {error ? (
                  <Alert variant="error">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">
                      {detail?.documentType ?? selectedDocument?.documentType ?? "Documento"}
                    </p>
                    <Badge variant={toneToBadgeVariant[statusTone(status)]}>{statusLabel(status)}</Badge>
                    {detail?.isCurrent === false ? <Badge variant="neutral">Versión anterior</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Origen: {detail?.sourceType === "upp" ? `UPP${detail.uppName ? ` · ${detail.uppName}` : ""}` : "Productor"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground mb-1">Subido</p>
                    <p className="font-medium">{formatDate(detail?.uploadedAt ?? selectedDocument?.uploadedAt ?? null)}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-muted-foreground mb-1">Vigencia actual</p>
                    <p className="font-medium">{formatDate(detail?.expiryDate ?? selectedDocument?.expiryDate ?? null)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-doc-status">Estado</Label>
                  <Select value={status} onValueChange={(value) => onStatusChange(value as AdminDocumentStatus)}>
                    <SelectTrigger id="admin-doc-status">
                      <SelectValue placeholder="Selecciona estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="validated">Validado</SelectItem>
                      <SelectItem value="expired">Vencido</SelectItem>
                      <SelectItem value="rejected">Rechazado</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-doc-expiry">Fecha de vigencia</Label>
                  <Input
                    id="admin-doc-expiry"
                    type="date"
                    value={expiryDate}
                    onChange={(event) => onExpiryDateChange(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-doc-comments">Comentarios</Label>
                  <Textarea
                    id="admin-doc-comments"
                    value={comments}
                    onChange={(event) => onCommentsChange(event.target.value)}
                    placeholder="Agrega observaciones para el productor"
                    rows={4}
                  />
                  {status === "expired" ? (
                    <p className="text-xs text-muted-foreground">
                      El comentario de vencido se guarda automáticamente como: Documento no vigente, favor actualizar.
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">OCR</p>
                  {detail?.ocrFields || detail?.extractedFields ? (
                    <pre className="text-xs rounded-md border p-3 overflow-auto bg-muted/20">
                      {JSON.stringify(detail.ocrFields ?? detail.extractedFields, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sin datos OCR disponibles para este documento.</p>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/60">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button variant="secondary" onClick={() => void onSaveAndNext()} disabled={isSaving || loading}>
              {isSaving ? "Guardando..." : "Guardar y siguiente"}
            </Button>
            <Button onClick={() => void onSave()} disabled={isSaving || loading}>
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar cambios</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes cambios sin guardar. ¿Deseas cerrar la revisión de todas formas?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              disabled={isSaving}
              onClick={() => {
                setShowDiscardDialog(false);
                onOpenChange(false);
              }}
            >
              Cerrar sin guardar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
