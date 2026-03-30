"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PaginationControls,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/ui";
import type { AdminProductor } from "@/modules/admin/productores/domain/entities/AdminProductorEntity";
import { toggleProducerStatus } from "@/modules/admin/productores/application/services";
import { Users, Zap } from "lucide-react";
import { AdminProductoresFilters } from "./AdminProductoresFilters";
import { AdminProductoresList } from "./AdminProductoresList";
import { useAdminProductores } from "./hooks/useAdminProductores";
import { useAdminCollars } from "./hooks/useAdminCollars";
import {
  CollarsFilters,
  CollarsTable,
  CollarCreateModal,
  CollarEditModal,
  useCreateCollar,
} from "@/modules/collars/presentation";
import type { CollarListItem } from "@/modules/collars/presentation/types";

export function AdminProductoresPageContent() {
  const router = useRouter();
  const [actionError, setActionError] = useState("");
  const [activeTab, setActiveTab] = useState("productores");
  const [isCreateCollarOpen, setIsCreateCollarOpen] = useState(false);
  const [editingCollar, setEditingCollar] = useState<CollarListItem | null>(null);

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

  const {
    collars,
    total: totalCollars,
    totalPages: totalCollarsPages,
    page: collarsPage,
    canPrev: collarsCanPrev,
    canNext: collarsCanNext,
    loading: collarsLoading,
    error: collarsError,
    sort: collarsSort,
    filters: collarsFilters,
    setPage: setCollarsPage,
    handleSortChange: handleCollarsSortChange,
    handleFiltersChange: handleCollarsFiltersChange,
    reload: reloadCollars,
  } = useAdminCollars();

  const createCollarHook = useCreateCollar();

  const handleViewMoreProducer = useCallback(
    (producerId: string) => {
      router.push(`/admin/producers/${producerId}?tab=overview`);
    },
    [router]
  );

  const handleEditProducer = useCallback(
    (producerId: string) => {
      router.push(`/admin/producers/${producerId}?tab=info&mode=edit`);
    },
    [router]
  );

  const handleToggleStatus = useCallback(
    async (producer: AdminProductor) => {
      setActionError("");

      try {
        const currentStatus = producer.status === "inactive" ? "inactive" : "active";
        await toggleProducerStatus(producer.id, currentStatus);
        await reload();
      } catch (err) {
        setActionError(
          err instanceof Error
            ? err.message
            : "No fue posible actualizar el productor."
        );
      }
    },
    [reload]
  );

  const handleViewCollarProducer = useCallback(
    (collar: CollarListItem) => {
      if (!collar.producer_id) return;
      router.push(`/admin/producers/${collar.producer_id}?tab=collares`);
    },
    [router]
  );

  return (
    <div className="space-y-6">
      {/* Header with global actions */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Gestión de productores</h1>
          <p className="text-sm text-muted-foreground">
            Altas, bajas, suspensiones, estado documental e historial, e inventario de collares.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/producers/new">Nuevo productor</Link>
          </Button>
          <Button size="sm" onClick={() => setIsCreateCollarOpen(true)}>
            Nuevo collar
          </Button>
        </div>
      </div>

      {/* Filters row (changes with tab) */}
      {activeTab === "productores" ? (
        <AdminProductoresFilters filters={filters} onChange={handleFiltersChange} />
      ) : (
        <CollarsFilters filters={collarsFilters} onChange={handleCollarsFiltersChange} />
      )}

      {/* Tabs between filters and tables */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="productores" className="gap-2">
            <Users className="h-4 w-4" />
            Productores
          </TabsTrigger>
          <TabsTrigger value="collares" className="gap-2">
            <Zap className="h-4 w-4" />
            Collares
          </TabsTrigger>
        </TabsList>

        {/* Productores Tab */}
        <TabsContent value="productores" className="space-y-4">
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
              {error || actionError ? (
                <p className="text-sm text-destructive">{error || actionError}</p>
              ) : null}

              {loading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Cargando...</p>
              ) : (
                <AdminProductoresList
                  productores={producers}
                  sort={sort}
                  onSortChange={handleSortChange}
                  onEdit={handleEditProducer}
                  onViewMore={handleViewMoreProducer}
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
        </TabsContent>

        {/* Collares Tab */}
        <TabsContent value="collares" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Collares IoT
                {!collarsLoading && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({totalCollars} en total)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {collarsError && (
                <p className="mb-4 text-sm text-destructive">{collarsError}</p>
              )}

              {collarsLoading && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Cargando collares...
                </p>
              )}

              {!collarsLoading && collars.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No hay collares registrados
                </p>
              )}

              {!collarsLoading && collars.length > 0 && (
                <>
                  <CollarsTable
                    collars={collars}
                    sort={collarsSort}
                    onSortChange={handleCollarsSortChange}
                    onViewProducer={handleViewCollarProducer}
                    onEdit={(collar) => setEditingCollar(collar)}
                  />
                  {totalCollarsPages > 1 && (
                    <div className="mt-4 border-t pt-4">
                      <PaginationControls
                        page={collarsPage}
                        totalPages={totalCollarsPages}
                        canPrev={collarsCanPrev}
                        canNext={collarsCanNext}
                        onPrev={() => setCollarsPage(collarsPage - 1)}
                        onNext={() => setCollarsPage(collarsPage + 1)}
                        onPageChange={setCollarsPage}
                      />
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Global create-collar modal */}
      <CollarCreateModal
        open={isCreateCollarOpen}
        onOpenChange={setIsCreateCollarOpen}
        createCollarHook={createCollarHook}
        onSuccess={() => {
          setIsCreateCollarOpen(false);
          reloadCollars();
        }}
      />

      {/* Edit-collar modal */}
      <CollarEditModal
        open={!!editingCollar}
        onOpenChange={(open) => {
          if (!open) {
            setEditingCollar(null);
          }
        }}
        collar={editingCollar}
        onSaved={() => {
          setEditingCollar(null);
          reloadCollars();
        }}
      />
    </div>
  );
}
