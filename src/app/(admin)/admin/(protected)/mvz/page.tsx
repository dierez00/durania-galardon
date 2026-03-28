"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Button, PaginationControls } from "@/shared/ui";
import {
  AdminMvzFilters,
  AdminMvzList,
  useAdminMvz,
} from "@/modules/admin/mvz/presentation";
import type { AdminMvz } from "@/modules/admin/mvz/domain/entities/AdminMvzEntity";
import { getAccessToken } from "@/shared/lib/auth-session";

export default function AdminMvzPage() {
  const router = useRouter();
  const [actionError, setActionError] = useState("");
  const {
    mvzProfiles,
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
  } = useAdminMvz();

  const handleViewMore = useCallback(
    (mvzId: string) => {
      router.push(`/admin/mvz/${mvzId}?tab=overview`);
    },
    [router]
  );

  const handleEdit = useCallback(
    (mvzId: string) => {
      router.push(`/admin/mvz/${mvzId}?tab=info&mode=edit`);
    },
    [router]
  );

  const handleToggleStatus = useCallback(
    async (mvz: AdminMvz) => {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        setActionError("No existe sesion activa.");
        return;
      }

      const nextStatus = mvz.status === "active" ? "inactive" : "active";
      setActionError("");

      const response = await fetch(`/api/admin/mvz/${mvz.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const body = await response.json();
      if (!response.ok || !body.ok) {
        setActionError(body.error?.message ?? "No fue posible actualizar el MVZ.");
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
          <h1 className="text-2xl font-bold">Gestión de MVZ</h1>
          <p className="text-sm text-muted-foreground">
            Alta, suspensión, asignación territorial e historial de pruebas.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/mvz/new">Nuevo MVZ</Link>
        </Button>
      </div>

      <AdminMvzFilters filters={filters} onChange={handleFiltersChange} />

      <Card>
        <CardHeader>
          <CardTitle>
            MVZ registrados
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
            <AdminMvzList
              mvzList={mvzProfiles}
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

