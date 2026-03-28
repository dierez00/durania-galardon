"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { PaginationControls } from "@/shared/ui/pagination-controls";
import {
  AdminCuarentenasFilters,
  AdminCuarentenasList,
  AdminCuarentenasMapSection,
  AdminCuarentenaActivacionForm,
  useAdminCuarentenas,
} from "@/modules/cuarentenas/admin/presentation";
import type { AdminCuarentena } from "@/modules/cuarentenas/admin/domain/entities/AdminCuarentenaEntity";
import { getAccessToken } from "@/shared/lib/auth-session";

export default function AdminQuarantinesPage() {
  const router = useRouter();
  const [activarOpen, setActivarOpen] = useState(false);
  const [actionError, setActionError] = useState("");
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

  const handleViewMore = useCallback(
    (quarantineId: string) => {
      router.push(`/admin/quarantines/${quarantineId}?tab=resumen`);
    },
    [router]
  );

  const handleEdit = useCallback(
    (quarantineId: string) => {
      router.push(`/admin/quarantines/${quarantineId}?tab=resumen&focus=status`);
    },
    [router]
  );

  const handleStatusChange = useCallback(
    async (quarantine: AdminCuarentena) => {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setActionError("No existe sesion activa.");
        return;
      }

      const nextStatus = quarantine.status === "active" ? "suspended" : "active";
      setActionError("");

      const response = await fetch(`/api/admin/quarantines/${quarantine.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const body = await response.json();
      if (!response.ok || !body.ok) {
        setActionError(body.error?.message ?? "No fue posible actualizar la cuarentena.");
        return;
      }

      await reload();
    },
    [reload]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Cuarentenas Estatales</h1>
          <p className="text-sm text-muted-foreground">
            Mapa general de geocercas, liberacion e historial epidemiologico.
          </p>
        </div>
        <Button onClick={() => { setActivarOpen(true); }}>
          + Activar cuarentena
        </Button>
      </div>

      <AdminCuarentenaActivacionForm
        open={activarOpen}
        onOpenChange={setActivarOpen}
        onSuccess={() => { setActivarOpen(false); void reload(); }}
      />

      <AdminCuarentenasMapSection points={mapPoints} loading={mapLoading} />

      <AdminCuarentenasFilters
        filters={filters}
        onChange={handleFiltersChange}
      />

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
          {error || actionError ? <p className="text-sm text-destructive">{error || actionError}</p> : null}

          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <AdminCuarentenasList
              cuarentenas={cuarentenas}
              sort={sort}
              onSortChange={handleSortChange}
              onEdit={handleEdit}
              onViewMore={handleViewMore}
              onStatusChange={handleStatusChange}
              isStatusActionDisabled={(quarantine) => quarantine.status === "released"}
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
