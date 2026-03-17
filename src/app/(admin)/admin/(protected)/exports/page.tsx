"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { AdminExportacionesList } from "@/modules/admin/exportaciones/presentation/AdminExportacionesList";
import { AdminExportacionesFilters } from "@/modules/admin/exportaciones/presentation/AdminExportacionesFilters";
import { AdminRegla60Config } from "@/modules/admin/exportaciones/presentation/AdminRegla60Config";
import { useAdminExportaciones } from "@/modules/admin/exportaciones/presentation/hooks/useAdminExportaciones";
import { AlertTriangle } from "lucide-react";

export default function AdminExportsPage() {
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
  } = useAdminExportaciones();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Solicitudes de Exportación</h1>
          <p className="text-sm text-muted-foreground">
            Validación y aprobación final de exportaciones ganaderas.
          </p>
        </div>
        <div className="w-full max-w-xs">
          <AdminRegla60Config />
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
            <div className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
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
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
