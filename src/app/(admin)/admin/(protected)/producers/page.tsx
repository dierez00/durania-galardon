"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Button, PaginationControls } from "@/shared/ui";
import {
  AdminProductoresFilters,
  AdminProductoresList,
  useAdminProductores,
} from "@/modules/admin/productores/presentation";
import type { AdminProductor } from "@/modules/admin/productores/domain/entities/AdminProductorEntity";
import { getAccessToken } from "@/shared/lib/auth-session";

export default function AdminProducersPage() {
  const router = useRouter();
  const [actionError, setActionError] = useState("");
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
    reload,
  } = useAdminProductores();

  const handleViewMore = useCallback(
    (producerId: string) => {
      router.push(`/admin/producers/${producerId}?tab=overview`);
    },
    [router]
  );

  const handleEdit = useCallback(
    (producerId: string) => {
      router.push(`/admin/producers/${producerId}?tab=info&mode=edit`);
    },
    [router]
  );

  const handleToggleStatus = useCallback(
    async (producer: AdminProductor) => {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setActionError("No existe sesion activa.");
        return;
      }

      const nextStatus = producer.status === "active" ? "inactive" : "active";
      setActionError("");

      const response = await fetch(`/api/admin/producers/${producer.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const body = await response.json();
      if (!response.ok || !body.ok) {
        setActionError(body.error?.message ?? "No fue posible actualizar el productor.");
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
          <h1 className="text-2xl font-bold">Gestión de productores</h1>
          <p className="text-sm text-muted-foreground">
            Altas, bajas, suspensiones, estado documental e historial.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/producers/new">Nuevo productor</Link>
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
          {error || actionError ? <p className="text-sm text-destructive">{error || actionError}</p> : null}

          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <AdminProductoresList
              productores={producers}
              sort={sort}
              onSortChange={handleSortChange}
              onEdit={handleEdit}
              onViewMore={handleViewMore}
              onToggleStatus={handleToggleStatus}
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
