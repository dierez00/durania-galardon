"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { PaginationControls } from "@/shared/ui/pagination-controls";
import {
  AdminCuarentenasFilters,
  AdminCuarentenasList,
  AdminCuarentenasMapSection,
  AdminCuarentenaActivacionForm,
  useAdminCuarentenas,
} from "@/modules/admin/cuarentenas/presentation";

export default function AdminQuarantinesPage() {
  const [activarOpen, setActivarOpen] = useState(false);
  const {
    cuarentenas,
    total,
    totalPages,
    page,
    canPrev,
    canNext,
    setPage,
    loading,
    error,
    filters,
    sort,
    handleFiltersChange,
    handleSortChange,
    reload,
    mapPoints,
    mapLoading,
  } = useAdminCuarentenas();

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Cuarentenas Estatales</h1>
          <p className="text-sm text-muted-foreground">
            Mapa global de geocercas, liberación e historial epidemiológico.
          </p>
        </div>
        <Button onClick={() => { setActivarOpen(true); }}>
          + Activar cuarentena
        </Button>
      </div>

      {/* Activación contextual (controlada desde el header) */}
      <AdminCuarentenaActivacionForm
        open={activarOpen}
        onOpenChange={setActivarOpen}
        onSuccess={() => { setActivarOpen(false); void reload(); }}
      />

      {/* Mapa */}
      <AdminCuarentenasMapSection points={mapPoints} loading={mapLoading} />

      {/* Filtros */}
      <AdminCuarentenasFilters
        filters={filters}
        onChange={handleFiltersChange}
      />

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>
            Historial de cuarentenas
            {!loading && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({total} en total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando…</p>
          ) : (
            <AdminCuarentenasList
              cuarentenas={cuarentenas}
              sort={sort}
              onSortChange={handleSortChange}
            />
          )}

          {!loading && totalPages > 1 && (
            <PaginationControls
              page={page}
              totalPages={totalPages}
              canPrev={canPrev}
              canNext={canNext}
              onPrev={() => setPage((p) => p - 1)}
              onNext={() => setPage((p) => p + 1)}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}


