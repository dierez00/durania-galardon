"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { AdminProductoresFilters } from "@/modules/admin/productores/presentation/AdminProductoresFilters";
import { AdminProductoresList } from "@/modules/admin/productores/presentation/AdminProductoresList";
import { useAdminProductores } from "@/modules/admin/productores/presentation/hooks/useAdminProductores";

export default function AdminProducersPage() {
  const {
    producers,
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
  } = useAdminProductores();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Gestion de Productores</h1>
          <p className="text-sm text-muted-foreground">
            Alta, baja/suspension, estado documental e historial.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/producers/new">Nuevo productor (lote)</Link>
        </Button>
      </div>

      <AdminProductoresFilters filters={filters} onChange={handleFiltersChange} />

      <Card>
        <CardHeader>
          <CardTitle>
            Productores registrados
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
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <AdminProductoresList
              productores={producers}
              sort={sort}
              onSortChange={handleSortChange}
            />
          )}

          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                Pagina {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canPrev}
                  onClick={() => setPage((currentPage) => currentPage - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canNext}
                  onClick={() => setPage((currentPage) => currentPage + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
