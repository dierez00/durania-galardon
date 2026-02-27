"use client";

import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { AdminMvzFilters } from "@/modules/admin/mvz/presentation/AdminMvzFilters";
import { AdminMvzList } from "@/modules/admin/mvz/presentation/AdminMvzList";
import { useAdminMvz } from "@/modules/admin/mvz/presentation/hooks/useAdminMvz";

export default function AdminMvzPage() {
  const { items, total, loading, error, filters, setFilters } = useAdminMvz();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Gestion de MVZ</h1>
          <p className="text-sm text-muted-foreground">
            Alta, suspension, asignacion territorial e historial de pruebas.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/mvz/new">Nuevo MVZ (lote)</Link>
        </Button>
      </div>

      <AdminMvzFilters filters={filters} onChange={setFilters} />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Cargando...</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{total} registros</p>
          <AdminMvzList mvzList={items} />
        </>
      )}
    </div>
  );
}
