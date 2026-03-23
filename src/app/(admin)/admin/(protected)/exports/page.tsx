"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { AdminExportacionesList } from "@/modules/exportaciones/admin/presentation/AdminExportacionesList";
import { AdminExportacionesFilters } from "@/modules/exportaciones/admin/presentation/AdminExportacionesFilters";
import { AdminRegla60Config } from "@/modules/exportaciones/admin/presentation/AdminRegla60Config";
import { useAdminExportaciones } from "@/modules/exportaciones/admin/presentation/hooks/useAdminExportaciones";
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
          <h1 className="text-2xl font-bold">Solicitudes de ExportaciÃ³n</h1>
          <p className="text-sm text-muted-foreground">
            ValidaciÃ³n y aprobaciÃ³n final de exportaciones ganaderas.
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
          <Alert variant="error">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <AlertDescription>{error}</AlertDescription>
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
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

