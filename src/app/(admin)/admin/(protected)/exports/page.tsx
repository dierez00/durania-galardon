"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { AdminExportacionesList } from "@/modules/exportaciones/admin/presentation/AdminExportacionesList";
import { AdminExportacionesFilters } from "@/modules/exportaciones/admin/presentation/AdminExportacionesFilters";
import type { AdminExportacion } from "@/modules/exportaciones/admin/domain/entities/AdminExportacionEntity";
import { useAdminExportaciones } from "@/modules/exportaciones/admin/presentation/hooks/useAdminExportaciones";
import { AlertTriangle } from "lucide-react";
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

export default function AdminExportsPage() {
  const router = useRouter();
  const [pendingDelete, setPendingDelete] = useState<AdminExportacion | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<{
    variant: "success" | "error";
    message: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const {
    exportaciones,
    total,
    totalPages,
    page,
    setPage,
    loading,
    error,
    filters,
    handleFiltersChange,
    sort,
    handleSortChange,
    reload,
    deleteExportacion,
  } = useAdminExportaciones();

  const handleViewMore = useCallback(
    (exportId: string) => {
      router.push(`/admin/exports/${exportId}?tab=info`);
    },
    [router]
  );

  const handleEdit = useCallback(
    (exportId: string) => {
      router.push(`/admin/exports/${exportId}?tab=info&focus=status`);
    },
    [router]
  );

  const handleDeleteRequest = useCallback((exportacion: AdminExportacion) => {
    setDeleteFeedback(null);
    setPendingDelete(exportacion);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) {
      return;
    }

    setDeleting(true);
    setDeleteFeedback(null);

    try {
      const shouldMoveBackOnePage = page > 1 && exportaciones.length === 1;
      await deleteExportacion(pendingDelete.id);
      setPendingDelete(null);

      if (shouldMoveBackOnePage) {
        setPage(page - 1);
      } else {
        await reload();
      }

      setDeleteFeedback({
        variant: "success",
        message: "La solicitud se elimino de la vista activa sin alterar su historial operativo.",
      });
    } catch (err) {
      setDeleteFeedback({
        variant: "error",
        message: err instanceof Error ? err.message : "No fue posible eliminar la exportacion.",
      });
    } finally {
      setDeleting(false);
    }
  }, [deleteExportacion, exportaciones.length, page, pendingDelete, reload, setPage]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Solicitudes de exportacion</h1>
          <p className="text-sm text-muted-foreground">
            Validacion y aprobacion final de exportaciones ganaderas.
          </p>
        </div>
      </div>

      <AdminExportacionesFilters filters={filters} onChange={handleFiltersChange} />

      <Card>
        <CardHeader>
          <CardTitle>
            Solicitudes registradas
            {!loading && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({total} en total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <Alert variant="error">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {deleteFeedback ? (
            <Alert variant={deleteFeedback.variant}>
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <AlertDescription>{deleteFeedback.message}</AlertDescription>
            </Alert>
          ) : null}

          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <AdminExportacionesList
              exportaciones={exportaciones}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              sort={sort}
              onSortChange={handleSortChange}
              onEdit={handleEdit}
              onViewMore={handleViewMore}
              onDelete={handleDeleteRequest}
            />
          )}
        </CardContent>
      </Card>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar solicitud</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `Se ocultara la solicitud ${pendingDelete.id} de la lista activa de exportaciones. Esta accion no cambia su estado de negocio.`
                : "Confirma la eliminacion de la solicitud."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
